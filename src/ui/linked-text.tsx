import { Linking, Text, type TextProps } from 'react-native';
import { useTheme } from './theme';

const URL = /(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]])/g;

/** Text whose web links open in the browser. Selectable, so a notice can be copied. */
export function LinkedText({ children, style, ...rest }: TextProps & { children: string }) {
  const t = useTheme();
  const parts = children.split(URL);
  return (
    <Text style={style} selectable {...rest}>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <Text
            key={i}
            style={{ color: t.ink, textDecorationLine: 'underline' }}
            onPress={() => Linking.openURL(p).catch(() => {})}>
            {p}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}
