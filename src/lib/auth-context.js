"use client";

import {createContext, useContext, useState, useEffect} from "react";

const AuthContext = createContext({});

export function AuthProvider({children}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated on mount
    const auth = localStorage.getItem("firext-auth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const login = (password) => {
    if (password === process.env.NEXT_PUBLIC_AUTH_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem("firext-auth", "true");
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("firext-auth");
  };

  return (
    <AuthContext.Provider value={{isAuthenticated, login, logout}}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
