import { StyleProp, ViewStyle } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import type { RouteOption } from "../../constants/mockRoutes";
import { DEFAULT_CENTER } from "../../utils/helpers";

type Props = {
  route?: RouteOption;
  style?: StyleProp<ViewStyle>;
};

export default function RouteMap({ route, style }: Props) {
  const path = route?.path ?? [];
  const lineColor = route && route.disruptionsCrossed > 0 ? "#c62828" : "#2e7d32";

  return (
    <MapView
      style={style}
      initialRegion={{
        latitude: DEFAULT_CENTER.latitude,
        longitude: DEFAULT_CENTER.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }}
    >
      {path.length > 0 && (
        <>
          <Polyline coordinates={path} strokeColor={lineColor} strokeWidth={5} />
          <Marker coordinate={path[0]} title="Start" />
          <Marker coordinate={path[path.length - 1]} title="Destination" />
        </>
      )}
    </MapView>
  );
}