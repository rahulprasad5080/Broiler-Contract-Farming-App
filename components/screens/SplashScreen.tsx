import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";

const progressDots = [0, 1, 2];

export function SplashScreen() {
  const { width } = useWindowDimensions();
  const pulse = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const dotAnimations = useRef(
    progressDots.map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    Animated.spring(logoScale, {
      toValue: 1,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    const dotAnimation = Animated.loop(
      Animated.stagger(
        160,
        dotAnimations.map((dot) =>
          Animated.sequence([
            Animated.timing(dot, {
              toValue: 1,
              duration: 360,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 360,
              useNativeDriver: true,
            }),
          ]),
        ),
      ),
    );

    pulseAnimation.start();
    dotAnimation.start();

    return () => {
      pulseAnimation.stop();
      dotAnimation.stop();
    };
  }, [dotAnimations, logoScale, pulse]);

  const haloScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  const haloOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.32, 0.12],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.shell}>
        <View style={styles.brandStage}>
          <Animated.View
            style={[
              styles.logoHalo,
              {
                opacity: haloOpacity,
                transform: [{ scale: haloScale }],
              },
            ]}
          />
          <Animated.View
            style={[styles.logoWrap, { transform: [{ scale: logoScale }] }]}
          >
            <Image
              source={require("../assets/logo.jpeg")}
              style={styles.logo}
              resizeMode="cover"
            />
          </Animated.View>
        </View>

        <Text style={styles.title}>Poultry Flow</Text>
        <Text style={styles.subtitle}>Smart records for healthier flocks</Text>

        <View
          style={[
            styles.metricRail,
            width < 360 ? styles.metricRailCompact : null,
          ]}
        >
          <View style={styles.metricChip}>
            <MaterialCommunityIcons
              name="clipboard-text-outline"
              size={17}
              color={Colors.primary}
            />
            <Text style={styles.metricText}>Daily</Text>
          </View>
          <View style={styles.metricChip}>
            <MaterialCommunityIcons
              name="silverware-fork"
              size={17}
              color={Colors.primary}
            />
            <Text style={styles.metricText}>Feed</Text>
          </View>
          <View style={styles.metricChip}>
            <MaterialCommunityIcons
              name="chart-line"
              size={17}
              color={Colors.primary}
            />
            <Text style={styles.metricText}>Reports</Text>
          </View>
        </View>

        <View style={styles.loader}>
          {progressDots.map((dot) => {
            const translateY = dotAnimations[dot].interpolate({
              inputRange: [0, 1],
              outputRange: [0, -8],
            });
            const opacity = dotAnimations[dot].interpolate({
              inputRange: [0, 1],
              outputRange: [0.45, 1],
            });
            const scale = dotAnimations[dot].interpolate({
              inputRange: [0, 1],
              outputRange: [0.85, 1.15],
            });

            return (
              <Animated.View
                key={dot}
                style={[
                  styles.loaderDot,
                  {
                    opacity,
                    transform: [{ translateY }, { scale }],
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  shell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: Colors.background,
  },
  brandStage: {
    width: 148,
    height: 148,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  logoHalo: {
    position: "absolute",
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: "#CFEBDD",
  },
  logoWrap: {
    width: 104,
    height: 104,
    borderRadius: 24,
    padding: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: "#DDEBE3",
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  logo: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  title: {
    color: Colors.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 6,
  },
  metricRail: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 26,
  },
  metricRailCompact: {
    gap: 6,
  },
  metricChip: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBE6D5",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
  },
  metricText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  loader: {
    position: "absolute",
    bottom: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});
