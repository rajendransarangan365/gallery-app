import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { colors } from '@gallery/ui-tokens';
import type { PhotoItem, GridDensity } from '@gallery/shared';

export default function AndroidApp() {
  const [gridDensity, setGridDensity] = useState<GridDensity>(3);
  const [photos] = useState<PhotoItem[]>([]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.canvas.base} />
      
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Photo Gallery</Text>
        <Text style={styles.subtitle}>Privacy-First AI</Text>
      </View>

      {/* Main Body: Zero Mock Data Empty State */}
      <View style={styles.body}>
        {photos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Your Gallery is Empty</Text>
            <Text style={styles.emptyText}>
              In compliance with the Zero Mock Data policy, grant storage permissions to scan your real photographs.
            </Text>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => console.log('Scanning MediaStore...')}
            >
              <Text style={styles.buttonText}>Scan Device Photos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.emptyText}>Rendering {photos.length} photos</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas.base,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.canvas.subtle,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: 'monospace',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    maxWidth: 320,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  scanButton: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

