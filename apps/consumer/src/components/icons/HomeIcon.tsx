import Svg, { Path } from "react-native-svg";

interface HomeIconProps {
  size?: number;
  color?: string;
}

export function HomeIcon({ size = 24, color = "#fff" }: HomeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.75 10.1718C4.75 9.04841 5.33697 8.00662 6.29704 7.40433L10.047 5.05299C10.8566 4.54549 11.2613 4.29174 11.7068 4.17086C11.9003 4.11836 12.0997 4.11836 12.2932 4.17086C12.7387 4.29174 13.1434 4.54549 13.953 5.05299L17.703 7.40433C18.663 8.00662 19.25 9.04841 19.25 10.1718V15.7936C19.25 17.7555 17.8388 19.4085 15.9097 19.7136C13.3238 20.1228 10.6762 20.1228 8.09033 19.7136C6.16123 19.4085 4.75 17.7555 4.75 15.7936V10.1718Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.2 15.75H14.8"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
