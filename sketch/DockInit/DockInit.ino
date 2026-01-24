#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <HX711.h>
#include <WiFiManager.h>
#include <Preferences.h>

#define API_KEY "AIzaSyAwY4z5tNqnjgXnboe8AHLnMNqqM-X8Dro"
#define DATABASE_URL "https://firext-system-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define DATABASE_SECRET "u6fIQZUsyNYvHd7TCByq1iyHSN1rUanDdBI8CQuo"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
Preferences preferences;

String dockId;

#define HX711_DOUT_PIN 26
#define HX711_SCK_PIN 18
#define CALIBRATION_FACTOR -1000.0
#define READINGS_PER_SAMPLE 5

#define LED_RED_PIN 13
#define LED_YELLOW_PIN 5
#define LED_GREEN_PIN 4

#define RESET_BUTTON_PIN 0  // Boot button on most ESP32 boards

const float THRESH_LOW = 3.2;
const float THRESH_MID = 4.1;

HX711 scale;

bool gBlinking = false;
bool gNearExpiry = false;
bool gIsReweighing = false;
unsigned long gLastBlinkTime = 0;
bool gAlertLedState = false;

FirebaseData blinkingStream;
FirebaseData expiryStream;
FirebaseData reweighingStream;

void blinkingStreamCallback(FirebaseStream data) {
  if (data.dataType() == "boolean") gBlinking = data.boolData();
}
void expiryStreamCallback(FirebaseStream data) {
  if (data.dataType() == "boolean") gNearExpiry = data.boolData();
}
void reweighingStreamCallback(FirebaseStream data) {
  if (data.dataType() == "boolean") gIsReweighing = data.boolData();
}
void streamTimeoutCallback(bool timeout) {
  if (timeout) Serial.println("Stream timed out.");
}

void pushStatus(float weight, int colorCode, bool isReweighing) {
  FirebaseJson json;
  json.set("weight", weight);

  // Report actual LED state based on current mode
  if (isReweighing) {
    // During reweighing, LEDs are lit based on weight thresholds
    json.set("ledstatus/redActive", colorCode == 0);
    json.set("ledstatus/yellowActive", colorCode == 1);
    json.set("ledstatus/greenActive", colorCode == 2);
  } else if (gBlinking) {
    // During blinking, only red LED is active (blinking)
    json.set("ledstatus/redActive", gAlertLedState);
    json.set("ledstatus/yellowActive", false);
    json.set("ledstatus/greenActive", false);
  } else if (gNearExpiry) {
    // During near expiry, only red LED is on
    json.set("ledstatus/redActive", true);
    json.set("ledstatus/yellowActive", false);
    json.set("ledstatus/greenActive", false);
  } else {
    // Otherwise, all LEDs are off
    json.set("ledstatus/redActive", false);
    json.set("ledstatus/yellowActive", false);
    json.set("ledstatus/greenActive", false);
  }

  Firebase.RTDB.updateNode(&fbdo, "/docks/" + dockId, &json);
}

void connectWiFi() {
  WiFiManager wifiManager;
  wifiManager.setConfigPortalTimeout(180);
  Serial.println("Starting WiFiManager Portal...");
  if (!wifiManager.autoConnect("Firext-Dock-Setup")) {
    Serial.println("Failed to connect, restarting...");
    delay(3000);
    ESP.restart();
  }
  Serial.println("WiFi Connected!");
  Serial.println(WiFi.localIP());
}

String getMacNoColon() {
  String mac = WiFi.macAddress();
  mac.replace(":", "");
  mac.toLowerCase();
  return mac;
}

String generateRandomSuffix(int length = 6) {
  const char* chars = "0123456789abcdefghijklmnopqrstuvwxyz";
  String suffix = "";
  for(int i = 0; i < length; i++) {
    suffix += chars[random(36)];
  }
  return suffix;
}

String generateUniqueId() {
  String mac = getMacNoColon();
  String suffix = generateRandomSuffix();
  return mac + "_" + suffix;
}

String findUniqueId() {
  String candidateId;
  bool idExists = true;

  // Keep generating IDs until we find one that doesn't exist
  while (idExists) {
    candidateId = generateUniqueId();
    String checkPath = "/docks/" + candidateId;

    if (Firebase.RTDB.get(&fbdo, checkPath)) {
      idExists = fbdo.dataType() != "null" && fbdo.dataType() != "undefined";
      if (idExists) {
        Serial.println("ID collision detected: " + candidateId + ", generating new ID...");
      }
    } else {
      // Error checking Firebase, assume ID is safe to use
      idExists = false;
    }
  }

  Serial.println("Found unique ID: " + candidateId);
  return candidateId;
}

String loadOrGenerateId() {
  // Open preferences in read/write mode
  preferences.begin("dock-config", false);
  String storedId = preferences.getString("dock_id", "");

  if (storedId.length() > 0) {
    Serial.println("Found stored ID: " + storedId);

    // Verify this ID still exists in Firebase
    String checkPath = "/docks/" + storedId;
    if (Firebase.RTDB.get(&fbdo, checkPath)) {
      if (fbdo.dataType() != "null" && fbdo.dataType() != "undefined") {
        Serial.println("✅ Using existing ID from storage: " + storedId);
        preferences.end();
        return storedId;
      } else {
        Serial.println("⚠️ Stored ID not found in Firebase, will generate new one");
      }
    } else {
      Serial.println("⚠️ Could not verify stored ID in Firebase");
    }
  } else {
    Serial.println("No stored ID found, will generate new one");
  }

  // Generate and save new unique ID
  String newId = findUniqueId();
  preferences.putString("dock_id", newId);
  preferences.end();

  Serial.println("💾 Saved new ID to storage: " + newId);
  return newId;
}

void createDockRecord() {
  // Load existing ID or generate a new one
  dockId = loadOrGenerateId();
  String path = "/docks/" + dockId;

  // Check if this dock already exists in Firebase
  bool exists = false;
  if (Firebase.RTDB.get(&fbdo, path)) {
    exists = fbdo.dataType() != "null" && fbdo.dataType() != "undefined";
  }

  if (exists) {
    // Dock already exists, just update connection timestamp and ensure hardware_mac is set
    Serial.println("📡 Dock already exists in Firebase, updating connection info...");

    FirebaseJson updateJson;
    updateJson.set("last_connected/.sv", "timestamp");  // Firebase server timestamp
    updateJson.set("hardware_mac", getMacNoColon());
    updateJson.set("device_created", true);

    if (Firebase.RTDB.updateNode(&fbdo, path, &updateJson)) {
      Serial.println("✅ Dock connection updated successfully.");
    } else {
      Serial.printf("⚠️ Failed to update connection: %s\n", fbdo.errorReason().c_str());
    }
  } else {
    // Create new dock record
    Serial.println("🆕 Creating new dock record with ID: " + dockId);

    FirebaseJson json;
    json.set("id", dockId);  // Store the ID in the record
    json.set("hardware_mac", getMacNoColon());  // Store original MAC for tracking
    json.set("device_created", true);  // Flag to indicate hardware creation
    json.set("ledstatus/redActive", false);
    json.set("ledstatus/yellowActive", false);
    json.set("ledstatus/greenActive", false);
    json.set("nearexpiration", false);
    json.set("toReweigh/status", "Reweigh Success");
    json.set("toReweigh/timestamp", (uint32_t)0);
    json.set("created_at/.sv", "timestamp");  // Firebase server timestamp
    json.set("last_connected/.sv", "timestamp");  // Firebase server timestamp

    if (Firebase.RTDB.updateNode(&fbdo, path, &json)) {
      Serial.println("✅ Dock record created successfully.");
    } else {
      Serial.printf("❌ Dock creation failed: %s\n", fbdo.errorReason().c_str());
    }
  }
}

void setup() {
  Serial.begin(115200);

  // Initialize random seed with ESP32 hardware random
  randomSeed(esp_random());

  // Check for reset button press at startup
  pinMode(RESET_BUTTON_PIN, INPUT_PULLUP);
  if (digitalRead(RESET_BUTTON_PIN) == LOW) {
    Serial.println("🔄 Reset button pressed! Clearing stored ID...");
    preferences.begin("dock-config", false);
    preferences.clear();  // Clear all stored preferences
    preferences.end();
    Serial.println("✅ Stored ID cleared. New ID will be generated.");

    // Blink all LEDs to indicate reset
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_RED_PIN, HIGH);
      digitalWrite(LED_YELLOW_PIN, HIGH);
      digitalWrite(LED_GREEN_PIN, HIGH);
      delay(200);
      digitalWrite(LED_RED_PIN, LOW);
      digitalWrite(LED_YELLOW_PIN, LOW);
      digitalWrite(LED_GREEN_PIN, LOW);
      delay(200);
    }
  }

  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_YELLOW_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(LED_YELLOW_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, LOW);

  scale.begin(HX711_DOUT_PIN, HX711_SCK_PIN);
  scale.set_scale(CALIBRATION_FACTOR);
  scale.tare();
  Serial.println("HX711 initialized and tared.");

  connectWiFi();

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = DATABASE_SECRET;
  Firebase.reconnectWiFi(true);
  Firebase.begin(&config, &auth);

  // Create dock record with unique ID (ID will be set in createDockRecord)
  createDockRecord();

  Firebase.RTDB.beginStream(&blinkingStream, "/docks/" + dockId + "/isBlinking");
  Firebase.RTDB.setStreamCallback(&blinkingStream, blinkingStreamCallback, streamTimeoutCallback);

  Firebase.RTDB.beginStream(&expiryStream, "/docks/" + dockId + "/isNearExpiry");
  Firebase.RTDB.setStreamCallback(&expiryStream, expiryStreamCallback, streamTimeoutCallback);

  Firebase.RTDB.beginStream(&reweighingStream, "/docks/" + dockId + "/isReweighing");
  Firebase.RTDB.setStreamCallback(&reweighingStream, reweighingStreamCallback, streamTimeoutCallback);
}

void loop() {
  float weightKg = scale.get_units(READINGS_PER_SAMPLE) / 100.0;
  
  int colorCode;
  if (weightKg <= THRESH_LOW) colorCode = 0;
  else if (weightKg <= THRESH_MID) colorCode = 1;
  else colorCode = 2;

  if (gBlinking) {
    if (millis() - gLastBlinkTime > 500) {
      gAlertLedState = !gAlertLedState;
      digitalWrite(LED_RED_PIN, gAlertLedState);
      gLastBlinkTime = millis();
    }
    digitalWrite(LED_YELLOW_PIN, LOW);
    digitalWrite(LED_GREEN_PIN, LOW);
  }
  else if (gNearExpiry) {
    digitalWrite(LED_RED_PIN, HIGH);
    digitalWrite(LED_YELLOW_PIN, LOW);
    digitalWrite(LED_GREEN_PIN, LOW);
  }
  else if (gIsReweighing) {
    digitalWrite(LED_RED_PIN, colorCode == 0);
    digitalWrite(LED_YELLOW_PIN, colorCode == 1);
    digitalWrite(LED_GREEN_PIN, colorCode == 2);
  }
  else {
    digitalWrite(LED_RED_PIN, LOW);
    digitalWrite(LED_YELLOW_PIN, LOW);
    digitalWrite(LED_GREEN_PIN, LOW);
  }

  pushStatus(weightKg, colorCode, gIsReweighing);
  delay(250);
}
