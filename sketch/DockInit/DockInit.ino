#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <HX711.h>
#include <WiFiManager.h>

#define API_KEY "AIzaSyBaUfe5b8LyA2mA-HtvUqUr77zKYm2KrJI"
#define DATABASE_URL "https://firext-124cd-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define DATABASE_SECRET "zFyJ6B9iLU8Vbq2b9nO3Pdy0KuScfevSPp5ixkGI"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

#define HX711_DOUT_PIN 26
#define HX711_SCK_PIN 18
#define CALIBRATION_FACTOR -1000.0
#define READINGS_PER_SAMPLE 5

#define LED_RED_PIN 13
#define LED_YELLOW_PIN 5
#define LED_GREEN_PIN 4

const float THRESH_LOW = 3.2;
const float THRESH_MID = 4.1;

// Real-time weight sensor update interval
#define WEIGHT_SENSOR_UPDATE_INTERVAL 500  // Update every 0.5 seconds

HX711 scale;

unsigned long lastWeightSensorUpdate = 0;
bool gIsBeingWeighed = false; // Track if ANY dock is being weighed on website

FirebaseData weighingStatusStream; // Stream for weighing status

void weighingStatusCallback(FirebaseStream data) {
  if (data.dataType() == "boolean") {
    bool newStatus = data.boolData();
    
    // Only update and print if status actually changed
    if (newStatus != gIsBeingWeighed) {
      gIsBeingWeighed = newStatus;
      Serial.print("🔄 Weighing status changed: ");
      Serial.println(gIsBeingWeighed ? "✅ ACTIVE - LEDs ON" : "❌ INACTIVE - LEDs OFF");
      
      // Immediately turn off LEDs if not weighing
      if (!gIsBeingWeighed) {
        digitalWrite(LED_RED_PIN, LOW);
        digitalWrite(LED_YELLOW_PIN, LOW);
        digitalWrite(LED_GREEN_PIN, LOW);
        Serial.println("💡 All LEDs turned OFF");
      }
    }
  }
}

void streamTimeoutCallback(bool timeout) {
  if (timeout) Serial.println("Stream timed out.");
}

void connectWiFi() {
  WiFiManager wifiManager;
  wifiManager.setConfigPortalTimeout(180);
  Serial.println("Starting WiFiManager Portal...");
  if (!wifiManager.autoConnect("Firext-Scale-Setup")) {
    Serial.println("Failed to connect, restarting...");
    delay(3000);
    ESP.restart();
  }
  Serial.println("WiFi Connected!");
  Serial.println(WiFi.localIP());
}

/**
 * Initialize the weight sensor in Firebase Realtime Database
 * Creates /weightSensor/scale1 path for the shared physical scale
 */
void initializeWeightSensor() {
  String sensorPath = "/weightSensor/scale1";
  
  FirebaseJson json;
  json.set("weight", 0.0);
  json.set("timestamp/.sv", "timestamp");  // Firebase server timestamp
  json.set("status", "ready");
  json.set("isWeighing", false);
  
  if (Firebase.RTDB.updateNode(&fbdo, sensorPath, &json)) {
    Serial.println("✓ Weight sensor initialized for real-time updates");
  } else {
    Serial.printf("✗ Failed to initialize weight sensor: %s\n", fbdo.errorReason().c_str());
  }
}

/**
 * Update the weight sensor with current reading
 * This is called continuously to provide real-time weight updates to the website
 * 
 * @param weight Current weight reading in kg
 */
void updateWeightSensor(float weight) {
  String weightPath = "/weightSensor/scale1/weight";
  
  // Update weight value
  if (Firebase.RTDB.setFloat(&fbdo, weightPath, weight)) {
    // Update timestamp using Firebase server time
    FirebaseJson json;
    json.set("timestamp/.sv", "timestamp");
    Firebase.RTDB.updateNode(&fbdo, "/weightSensor/scale1", &json);
  }
  // Errors are silently ignored to avoid spam in Serial Monitor
}

void setup() {
  Serial.begin(115200);

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

  // Initialize weight sensor for real-time updates
  initializeWeightSensor();
  
  // Listen to global weighing status from website
  Firebase.RTDB.beginStream(&weighingStatusStream, "/weightSensor/scale1/isWeighing");
  Firebase.RTDB.setStreamCallback(&weighingStatusStream, weighingStatusCallback, streamTimeoutCallback);
  
  Serial.println("\n=================================");
  Serial.println("✅ Shared Weighing Scale Ready!");
  Serial.println("=================================");
  Serial.println("Real-time weight broadcasting enabled");
  Serial.println("Listening for website weighing activity");
  Serial.println("This scale serves ALL docks");
  Serial.println();
}

void loop() {
  // Real-time weight sensor update for website
  unsigned long currentMillis = millis();
  if (currentMillis - lastWeightSensorUpdate >= WEIGHT_SENSOR_UPDATE_INTERVAL) {
    lastWeightSensorUpdate = currentMillis;
    
    if (scale.is_ready()) {
      float weightKg = scale.get_units(READINGS_PER_SAMPLE) / 100.0;
      updateWeightSensor(weightKg);
    }
  }
  
  // Read current weight for LED display
  float weightKg = scale.get_units(READINGS_PER_SAMPLE) / 100.0;
  
  // Determine LED color based on weight
  int colorCode;
  if (weightKg <= THRESH_LOW) colorCode = 0;       // Red: Low weight
  else if (weightKg <= THRESH_MID) colorCode = 1;  // Yellow: Medium weight
  else colorCode = 2;                               // Green: Good weight

  // LED Control: Only show weight status when website is actively weighing
  if (gIsBeingWeighed) {
    // Website is actively weighing a dock - show real-time weight status
    digitalWrite(LED_RED_PIN, colorCode == 0);
    digitalWrite(LED_YELLOW_PIN, colorCode == 1);
    digitalWrite(LED_GREEN_PIN, colorCode == 2);
  }
  else {
    // Not weighing - all LEDs off
    digitalWrite(LED_RED_PIN, LOW);
    digitalWrite(LED_YELLOW_PIN, LOW);
    digitalWrite(LED_GREEN_PIN, LOW);
  }

  delay(250);
}