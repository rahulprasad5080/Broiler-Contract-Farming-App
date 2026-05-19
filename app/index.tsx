import { Redirect } from "expo-router";

// This is the entry point of the app. It redirects to the login screen.

export default function Index() {
  return <Redirect href="/(auth)/login1" />;
}
