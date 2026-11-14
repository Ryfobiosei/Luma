import React from 'react';
import { View, Image } from 'react-native';
import useThemeStore from '../store/theme';
import * as Icons from "lucide-react-native";

const AppLogo = ({ size = 24 }) => {
  const { themeColors, isIncognito } = useThemeStore();

  if (isIncognito) {
    return (
      <View style={{ width: size, height: size }}>
        <Icons.UserCog size={size} color={themeColors.text} />
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      <Image source={require("../assets/branding/luma-mark.png")} style={{ width: size, height: size }} resizeMode="contain" />
    </View>
  );
};

export default AppLogo; 