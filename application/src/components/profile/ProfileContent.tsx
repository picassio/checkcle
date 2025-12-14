
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "@/services/userService";
import { UserProfileDetails } from "./UserProfileDetails";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { UpdateProfileForm } from "./UpdateProfileForm";

interface ProfileContentProps {
  currentUser: User | null;
  onUserUpdated?: () => Promise<void>;
}

export function ProfileContent({ currentUser, onUserUpdated }: ProfileContentProps) {
  const [activeTab, setActiveTab] = useState("details");

  // When active tab changes, refresh user data if needed
  useEffect(() => {
    if (activeTab === "details" && onUserUpdated) {
      onUserUpdated();
    }
  }, [activeTab, onUserUpdated]);

  if (!currentUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Your profile information could not be loaded</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold">My Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left column - Profile summary card */}
        <Card className="lg:col-span-1">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Profile Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            <UserProfileDetails user={currentUser} />
          </CardContent>
        </Card>

        {/* Right column - Profile tabs for edit and password change */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">My Account</CardTitle>
            <CardDescription className="text-sm">Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="details" className="text-sm">Profile Details</TabsTrigger>
                <TabsTrigger value="security" className="text-sm">Security</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="pt-4">
                <UpdateProfileForm user={currentUser} />
              </TabsContent>

              <TabsContent value="security" className="pt-4">
                <ChangePasswordForm userId={currentUser.id} />
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="text-xs md:text-sm text-muted-foreground p-4 md:p-6 pt-0 md:pt-0">
            Last updated: {new Date(currentUser.updated).toLocaleString()}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}