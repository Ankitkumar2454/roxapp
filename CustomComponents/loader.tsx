import { BlurView } from 'expo-blur';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Self-animating bouncing dots SVG
const spinnerSvg = `
<svg fill="#009BFFFF" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <circle cx="4" cy="12" r="3">
    <animate id="spinner_qFRN" begin="0;spinner_OcgL.end+0.25s" attributeName="cy" 
             calcMode="spline" dur="0.6s" values="12;6;12" 
             keySplines=".33,.66,.66,1;.33,0,.66,.33"/>
  </circle>
  <circle cx="12" cy="12" r="3">
    <animate begin="spinner_qFRN.begin+0.1s" attributeName="cy" 
             calcMode="spline" dur="0.6s" values="12;6;12" 
             keySplines=".33,.66,.66,1;.33,0,.66,.33"/>
  </circle>
  <circle cx="20" cy="12" r="3">
    <animate id="spinner_OcgL" begin="spinner_qFRN.begin+0.2s" attributeName="cy" 
             calcMode="spline" dur="0.6s" values="12;6;12" 
             keySplines=".33,.66,.66,1;.33,0,.66,.33"/>
  </circle>
</svg>`;

interface GlobalLoaderProps {
    visible: boolean;
    message?: string;
}

const GlobalLoader: React.FC<GlobalLoaderProps> = ({ visible, message }) => {
    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            <BlurView intensity={80} tint="dark" style={styles.blur} />
            <SvgXml xml={spinnerSvg} width={80} height={80} />
            {message && <Text style={styles.message}>{message}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        width,
        height,
        top: 0,
        left: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    blur: {
        position: 'absolute',
        width,
        height,
        top: 0,
        left: 0,
    },
    message: {
        color: '#fff',
        marginTop: 20,
        fontSize: 16,
        fontWeight: '600',
    },
});

export default GlobalLoader;