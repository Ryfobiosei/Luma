import {Redirect} from "expo-router";
import {useEffect, useState} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {View, ActivityIndicator, Platform} from "react-native";
import * as MediaLibrary from "expo-media-library";

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const value = await AsyncStorage.getItem("@onboarding_complete");
      setHasCompletedOnboarding(value === "true");
      
      // Request media permissions on app startup if onboarding is complete
      if (value === "true" && Platform.OS !== "web") {
        console.log('Requesting media permissions on app startup...');
        try {
          const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
          console.log('Media permission status:', { status, canAskAgain });
        } catch (error) {
          console.error('Error requesting media permissions:', error);
        }
      }
    } catch (err) {
      console.log("Error checking onboarding status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#121212",
        }}
      >
        <ActivityIndicator size="large" color="#FF00FF" />
      </View>
    );
  }

  return (
    <Redirect
      href={hasCompletedOnboarding ? "/(tabs)/(video)" : "/(onboarding)"}
    />
  );
}
