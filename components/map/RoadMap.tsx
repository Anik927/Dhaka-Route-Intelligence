// Shared map component. Member 3 reuses it for the Route Planner by passing
// <Polyline /> and <Polygon /> elements as children, and a ref for fitToCoordinates.

import React, { forwardRef } from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, type MapViewProps } from "react-native-maps";

import { CATEGORY_COLORS, type CommunityReport } from "../../services/communityService";
import { DEFAULT_CENTER } from "../../utils/helpers";

type Props = MapViewProps & {
  reports?: CommunityReport[];
  onReportPress?: (id: string) => void;
};

const RoadMap = forwardRef<MapView, Props>(function RoadMap(
  { reports = [], onReportPress, children, style, ...rest },
  ref
) {
  return (
    <MapView
      ref={ref}
      style={[styles.map, style]}
      initialRegion={{
        ...DEFAULT_CENTER,
        latitudeDelta: 0.07,
        longitudeDelta: 0.07,
      }}
      {...rest}
    >
      {reports.map((r) => (
        <Marker
          key={r.id}
          coordinate={{ latitude: r.latitude, longitude: r.longitude }}
          title={r.title}
          description={
            r.communityStatus === "Disputed" ? `${r.category} (disputed)` : r.category
          }
          pinColor={CATEGORY_COLORS[r.category]}
          onCalloutPress={() => onReportPress?.(r.id)}
        />
      ))}
      {children}
    </MapView>
  );
});

export default RoadMap;

const styles = StyleSheet.create({
  map: { flex: 1 },
});