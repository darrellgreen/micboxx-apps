import { StyleSheet, View } from "react-native";
import { ShimmerPlaceholder } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

export function NotificationsFeedSkeleton() {
  const rows: [number, number][] = [
    [220, 128],
    [196, 148],
    [236, 108],
  ];

  return (
    <View style={styles.notificationList}>
      {rows.map(([headlineWidth, previewWidth], index) => (
        <View
          key={`${headlineWidth}-${previewWidth}-${index}`}
          style={styles.notificationSkeletonRow}
        >
          <View style={styles.notificationSkeletonBody}>
            <ShimmerPlaceholder width={32} height={32} borderRadius={16} />
            <View style={styles.notificationSkeletonCopy}>
              <ShimmerPlaceholder
                width={headlineWidth}
                height={11}
                borderRadius={999}
              />
              <ShimmerPlaceholder
                width={previewWidth}
                height={11}
                borderRadius={999}
                style={{ opacity: 0.62 }}
              />
            </View>
          </View>
          <ShimmerPlaceholder width={28} height={10} borderRadius={999} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  notificationList: {
    alignSelf: "stretch",
    marginHorizontal: -20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.colors.borderSubtle,
  },
  notificationSkeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.colors.borderSubtle,
  },
  notificationSkeletonBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notificationSkeletonCopy: {
    flex: 1,
    gap: 8,
  },
});
