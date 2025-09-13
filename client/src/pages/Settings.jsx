import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { ProfileSettings } from "../components/settings/profile-settings"
import { WorkspaceSettings } from "../components/settings/workspace-settings"
import { NotificationSettings } from "../components/settings/notification-settings"
import  ConsentSettings  from "../components/settings/ConsentSettings";

function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and workspace settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Manage your preferences and account settings</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="workspace">Workspace</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="consent">Consent</TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
              <ProfileSettings />
            </TabsContent>
            <TabsContent value="workspace">
              <WorkspaceSettings />
            </TabsContent>
            <TabsContent value="notifications">
              <NotificationSettings />
            </TabsContent>
            <TabsContent value="consent">
              <ConsentSettings />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default Settings
