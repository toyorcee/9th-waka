import HomeLanding from "@/components/HomeLanding";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return null; 
  }

  if (!isAuthenticated) {
    return null; 
  }

  return <HomeLanding />;
}
