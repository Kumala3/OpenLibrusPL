// The app's entry. The background check is defined first: WorkManager can
// start the JavaScript with no screen at all, and the task has to exist by
// the time it asks for it.
import './src/lib/background';
import 'expo-router/entry';
