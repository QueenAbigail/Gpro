import React, { useMemo } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { WebView } from "react-native-webview";

interface AttendanceMapProps {
  userLocation: { lat: number; lon: number } | null;
  targetLocation?: {
    latitude: number | string;
    longitude: number | string;
    radius?: number | string;
    name?: string;
  } | null;
  isLocationValid: boolean;
  isMobileMode?: boolean;
}

export default function AttendanceMap({
  userLocation,
  targetLocation,
  isLocationValid,
  isMobileMode = false,
}: AttendanceMapProps) {
  const mapHtml = useMemo(() => {
    if (!userLocation) return "";

    const userLat = userLocation.lat;
    const userLon = userLocation.lon;

    const hasTarget =
      !isMobileMode &&
      targetLocation &&
      targetLocation.latitude !== undefined &&
      targetLocation.longitude !== undefined &&
      Number(targetLocation.latitude) !== 0 &&
      Number(targetLocation.longitude) !== 0;

    const officeLat = hasTarget ? Number(targetLocation.latitude) : null;
    const officeLon = hasTarget ? Number(targetLocation.longitude) : null;
    const radius = hasTarget ? Number(targetLocation.radius) || 50 : 50;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; }
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background: #f1f5f9;
      overflow: hidden;
    }
    .user-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .user-marker-pulse {
      position: absolute;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(37, 99, 235, 0.28);
      animation: pulse-ring 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    .user-marker-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #2563eb;
      border: 2.5px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      z-index: 2;
    }
    @keyframes pulse-ring {
      0% { transform: scale(0.6); opacity: 0.9; }
      50% { transform: scale(1.3); opacity: 0.15; }
      100% { transform: scale(0.6); opacity: 0.9; }
    }
    .office-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: #4f46e5;
      border-radius: 50%;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      font-size: 13px;
      line-height: 1;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      scrollWheelZoom: false,
      boxZoom: false,
      keyboard: false
    });

    // Esri World Light Gray Base (100% Cool Gray & White, Zero Yellow/Cream)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxNativeZoom: 16,
      maxZoom: 18
    }).addTo(map);

    // Esri World Light Gray Reference (Labels & Road Names)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
      maxNativeZoom: 16,
      maxZoom: 18
    }).addTo(map);

    var userIcon = L.divIcon({
      className: 'user-marker',
      html: '<div class="user-marker-pulse"></div><div class="user-marker-dot"></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    L.marker([${userLat}, ${userLon}], { icon: userIcon }).addTo(map);

    ${
      hasTarget && officeLat !== null && officeLon !== null
        ? `
      var officeIcon = L.divIcon({
        className: 'office-marker',
        html: '🏢',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      L.marker([${officeLat}, ${officeLon}], { icon: officeIcon }).addTo(map);

      L.circle([${officeLat}, ${officeLon}], {
        radius: ${radius},
        color: '${isLocationValid ? "#10b981" : "#f59e0b"}',
        fillColor: '${isLocationValid ? "#10b981" : "#f59e0b"}',
        fillOpacity: 0.18,
        weight: 2
      }).addTo(map);

      ${
        !isLocationValid
          ? `
        L.polyline([
          [${userLat}, ${userLon}],
          [${officeLat}, ${officeLon}]
        ], {
          color: '#ef4444',
          dashArray: '5, 5',
          weight: 2
        }).addTo(map);
      `
          : ""
      }

      var bounds = L.latLngBounds([
        [${userLat}, ${userLon}],
        [${officeLat}, ${officeLon}]
      ]);
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
    `
        : `
      map.setView([${userLat}, ${userLon}], 15);
    `
    }
  </script>
</body>
</html>`;
  }, [userLocation, targetLocation, isLocationValid, isMobileMode]);

  if (!userLocation) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-100">
        <ActivityIndicator size="small" color="#0284c7" />
        <Text className="text-slate-400 text-xs mt-2 font-medium">
          Mengunci Sinyal GPS...
        </Text>
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <View
        pointerEvents="none"
        style={{ width: "100%", height: "100%", overflow: "hidden" }}
      >
        <iframe
          srcDoc={mapHtml}
          title="Attendance Map"
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            pointerEvents: "none",
          }}
        />
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={{ width: "100%", height: "100%", overflow: "hidden" }}
    >
      <WebView
        originWhitelist={["*"]}
        source={{ html: mapHtml }}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled={true}
        domStorageEnabled={true}
        androidLayerType="hardware"
        mixedContentMode="always"
        style={{ width: "100%", height: "100%", backgroundColor: "#f1f5f9" }}
      />
    </View>
  );
}
