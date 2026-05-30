import Svg, { Path } from "react-native-svg";

type RoomReactionIconProps = {
  size?: number;
  color?: string;
};

export function RoomReactionFireIcon({ size = 18 }: RoomReactionIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityRole="image">
      <Path
        d="M20 15.0002C20 19.2547 17.3819 21.1216 15.3588 21.7512C14.9274 21.8854 14.6438 21.3825 14.9019 21.0116C15.7823 19.7464 16.8 17.8161 16.8 16.0002C16.8 14.0496 15.1559 11.7467 13.8721 10.3263C13.5786 10.0016 13.0667 10.2164 13.0507 10.6539C12.9976 12.1031 12.7689 14.042 11.7828 15.5616C11.6241 15.8062 11.2872 15.8264 11.1063 15.5977C10.7982 15.208 10.4901 14.7267 10.182 14.3464C10.016 14.1416 9.71604 14.1388 9.52461 14.32C8.77825 15.0267 7.73333 16.1288 7.73333 17.5002C7.73333 18.4301 8.0936 19.405 8.50007 20.1893C8.72368 20.6208 8.32607 21.1402 7.89573 20.9144C6.11307 19.9789 4 18.0838 4 15.0002C4 11.8538 8.31029 7.49503 9.95605 3.37712C10.2157 2.72733 11.0161 2.42199 11.5727 2.84603C14.9439 5.41409 20 10.3783 20 15.0002Z"
        fill="#ff5a2a"
      />
    </Svg>
  );
}

export function RoomReactionHeartIcon({ size = 18 }: RoomReactionIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityRole="image">
      <Path
        d="M2 9.1371C2 14 6.01943 16.5914 8.96173 18.9109C10 19.7294 11 20.5 12 20.5C13 20.5 14 19.7294 15.0383 18.9109C17.9806 16.5914 22 14 22 9.1371C22 4.27416 16.4998 0.825464 12 5.50063C7.50016 0.825464 2 4.27416 2 9.1371Z"
        fill="#a855f7"
      />
    </Svg>
  );
}

export function RoomReactionWaveIcon({ size = 18, color = "#eeeeF2" }: RoomReactionIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityRole="image">
      <Path
        d="M3 12H7L9 19L12 5L15 17L17 12H21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}