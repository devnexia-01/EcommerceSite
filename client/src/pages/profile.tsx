import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, MapPin, Package, Settings, Heart, CreditCard, Shield, Download, Palette, Globe, Key, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { NotificationTest } from "@/components/NotificationTest";

const profileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional()
});

const addressSchema = z.object({
  type: z.enum(["shipping", "billing"]),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  streetAddress: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  country: z.string().default("US"),
  isDefault: z.boolean().default(false)
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type AddressFormData = z.infer<typeof addressSchema>;
type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

export default function Profile() {
  const [activeTab, setActiveTab] = useState("profile");
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  
  // Settings state
  const [settings, setSettings] = useState({
    notifications: {
      orderUpdates: true,
      promotionalEmails: false,
      productRecommendations: true,
      securityAlerts: true
    },
    privacy: {
      dataAnalytics: false,
      personalizedRecommendations: true,
      marketingCommunications: false,
      activityTracking: false
    },
    security: {
      twoFactorEnabled: false,
    },
    preferences: {
      theme: "system",
      language: "en"
    }
  });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: ""
    }
  });

  const addressForm = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      type: "shipping",
      firstName: "",
      lastName: "",
      streetAddress: "",
      city: "",
      state: "",
      zipCode: "",
      country: "US",
      isDefault: false
    }
  });

  const passwordForm = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });

  // Update form values when user data loads
  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phoneNumber || ""
      });
    }
  }, [user, profileForm]);

  const { data: orders = [], isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    enabled: isAuthenticated
  });

  const { data: addresses = [], isLoading: addressesLoading } = useQuery<any[]>({
    queryKey: ["/api/addresses"],
    enabled: isAuthenticated
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => apiRequest("PUT", `/api/v1/users/${user?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/auth/me"] });
      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    }
  });

  const createAddressMutation = useMutation({
    mutationFn: (data: AddressFormData) => apiRequest("POST", "/api/addresses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      addressForm.reset();
      setEditingAddress(null);
      toast({
        title: "Success",
        description: "Address saved successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save address",
        variant: "destructive"
      });
    }
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (addressId: string) => apiRequest("DELETE", `/api/addresses/${addressId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      toast({
        title: "Success",
        description: "Address deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete address",
        variant: "destructive"
      });
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/v1/users/${user?.id}`),
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted"
      });
      // Clear all data and redirect to home
      queryClient.clear();
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive"
      });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordChangeFormData) => apiRequest("PUT", `/api/v1/users/${user?.id}/password`, data),
    onSuccess: () => {
      passwordForm.reset();
      setShowPasswordChange(false);
      toast({
        title: "Success",
        description: "Password changed successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive"
      });
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: typeof settings) => apiRequest("PUT", `/api/v1/users/${user?.id}/settings`, newSettings),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Settings updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive"
      });
    }
  });

  // Load user settings from backend
  const { data: userSettings } = useQuery({
    queryKey: [`/api/v1/users/${user?.id}/settings`],
    enabled: !!user?.id,
    onSuccess: (data: any) => {
      if (data?.settings) {
        setSettings(data.settings);
      }
    }
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Please Login</h2>
            <p className="text-muted-foreground mb-4">
              You need to be logged in to access your profile
            </p>
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onUpdateProfile = async (data: ProfileFormData) => {
    await updateProfileMutation.mutateAsync(data);
  };

  const onSaveAddress = async (data: AddressFormData) => {
    await createAddressMutation.mutateAsync(data);
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (confirm("Are you sure you want to delete this address?")) {
      await deleteAddressMutation.mutateAsync(addressId);
    }
  };

  const handleEditAddress = (address: any) => {
    setEditingAddress(address.id);
    addressForm.reset({
      type: address.type || "shipping",
      firstName: address.firstName || "",
      lastName: address.lastName || "",
      streetAddress: address.streetAddress || "",
      city: address.city || "",
      state: address.state || "",
      zipCode: address.zipCode || "",
      country: address.country || "US",
      isDefault: address.isDefault || false
    });
  };

  const handleDeleteAccount = () => {
    const confirmation = confirm(
      "Are you absolutely sure you want to delete your account? This action cannot be undone and all your data will be permanently lost."
    );
    
    if (confirmation) {
      const finalConfirmation = confirm(
        "This is your final warning. Your account, orders, addresses, and all associated data will be permanently deleted. Type 'DELETE' in the next prompt to confirm."
      );
      
      if (finalConfirmation) {
        const typedConfirmation = prompt(
          "Please type 'DELETE' in capital letters to confirm account deletion:"
        );
        
        if (typedConfirmation === "DELETE") {
          deleteAccountMutation.mutate();
        } else {
          toast({
            title: "Cancelled",
            description: "Account deletion cancelled - confirmation text did not match"
          });
        }
      }
    }
  };

  const updateNotificationSetting = (key: keyof typeof settings.notifications, value: boolean) => {
    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value
      }
    };
    setSettings(newSettings);
    updateSettingsMutation.mutate(newSettings);
  };

  const updatePrivacySetting = (key: keyof typeof settings.privacy, value: boolean) => {
    const newSettings = {
      ...settings,
      privacy: {
        ...settings.privacy,
        [key]: value
      }
    };
    setSettings(newSettings);
    updateSettingsMutation.mutate(newSettings);
  };

  const updateSecuritySetting = (key: keyof typeof settings.security, value: boolean) => {
    const newSettings = {
      ...settings,
      security: {
        ...settings.security,
        [key]: value
      }
    };
    setSettings(newSettings);
    updateSettingsMutation.mutate(newSettings);
  };

  const updatePreferenceSetting = (key: keyof typeof settings.preferences, value: string) => {
    const newSettings = {
      ...settings,
      preferences: {
        ...settings.preferences,
        [key]: value
      }
    };
    setSettings(newSettings);
    updateSettingsMutation.mutate(newSettings);
  };

  const onChangePassword = async (data: PasswordChangeFormData) => {
    await changePasswordMutation.mutateAsync(data);
  };

  const handleDataExport = async () => {
    try {
      const response = await fetch(`/api/v1/users/${user?.id}/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `user-data-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Data Export",
        description: "Your data has been downloaded successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-accent text-accent-foreground";
      case "shipped":
        return "bg-primary text-primary-foreground";
      case "processing":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "cancelled":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="profile-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-primary to-accent p-6 text-primary-foreground rounded-lg mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <User className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="profile-name">
                {user?.firstName || user?.username} {user?.lastName || ""}
              </h1>
              <p className="text-primary-foreground/80" data-testid="profile-email">
                {user?.email}
              </p>
              <p className="text-sm text-primary-foreground/60">
                Member since {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2" data-testid="tab-profile">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2" data-testid="tab-orders">
              <Package className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="addresses" className="flex items-center gap-2" data-testid="tab-addresses">
              <MapPin className="h-4 w-4" />
              Addresses
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2" data-testid="tab-settings">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="profile-first-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="profile-last-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} data-testid="profile-email-input" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="profile-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      data-testid="save-profile"
                    >
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="text-center py-8">
                    <LoadingSpinner className="mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading orders...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                    <p className="text-muted-foreground mb-4">
                      You haven't placed any orders yet
                    </p>
                    <Button asChild>
                      <Link href="/products">Start Shopping</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order: any) => (
                      <div key={order.id} className="border border-border rounded-lg p-4" data-testid={`order-${order.id}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium">#{order.orderNumber}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${parseFloat(order.total).toFixed(2)}</p>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                        
                        {order.orderItems && order.orderItems.length > 0 && (
                          <div className="flex items-center space-x-4">
                            <img
                              src={order.orderItems[0].product?.imageUrl || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=60&h=60"}
                              alt="Order item"
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="flex-1">
                              <p className="text-sm">
                                {order.orderItems[0].product?.name}
                                {order.orderItems.length > 1 && ` and ${order.orderItems.length - 1} other item(s)`}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" data-testid={`view-order-${order.id}`}>
                                View Details
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Saved Addresses
                  <Button 
                    onClick={() => setEditingAddress("new")}
                    data-testid="add-address"
                  >
                    Add Address
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {addressesLoading ? (
                  <div className="text-center py-8">
                    <LoadingSpinner className="mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading addresses...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {addresses.map((address: any) => (
                      <div key={address.id} className="border border-border rounded-lg p-4" data-testid={`address-${address.id}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">
                                {address.type.charAt(0).toUpperCase() + address.type.slice(1)}
                              </Badge>
                              {address.isDefault && (
                                <Badge className="bg-accent text-accent-foreground">Default</Badge>
                              )}
                            </div>
                            <p className="font-medium">
                              {address.firstName} {address.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {address.streetAddress}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {address.city}, {address.state} {address.zipCode}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {address.country}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditAddress(address)}
                              data-testid={`edit-address-${address.id}`}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteAddress(address.id)}
                              data-testid={`delete-address-${address.id}`}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {addresses.length === 0 && (
                      <div className="text-center py-8">
                        <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No addresses saved</h3>
                        <p className="text-muted-foreground mb-4">
                          Add an address for faster checkout
                        </p>
                        <Button onClick={() => setEditingAddress("new")}>
                          Add Your First Address
                        </Button>
                      </div>
                    )}

                    {/* Address Form */}
                    {editingAddress && (
                      <Card className="mt-6">
                        <CardHeader>
                          <CardTitle>
                            {editingAddress === "new" ? "Add New Address" : "Edit Address"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Form {...addressForm}>
                            <form onSubmit={addressForm.handleSubmit(onSaveAddress)} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={addressForm.control}
                                  name="firstName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>First Name</FormLabel>
                                      <FormControl>
                                        <Input {...field} data-testid="address-first-name" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={addressForm.control}
                                  name="lastName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Last Name</FormLabel>
                                      <FormControl>
                                        <Input {...field} data-testid="address-last-name" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <FormField
                                control={addressForm.control}
                                name="streetAddress"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Street Address</FormLabel>
                                    <FormControl>
                                      <Input {...field} data-testid="address-street" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                  control={addressForm.control}
                                  name="city"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>City</FormLabel>
                                      <FormControl>
                                        <Input {...field} data-testid="address-city" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={addressForm.control}
                                  name="state"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>State</FormLabel>
                                      <FormControl>
                                        <Input {...field} data-testid="address-state" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={addressForm.control}
                                  name="zipCode"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>ZIP Code</FormLabel>
                                      <FormControl>
                                        <Input {...field} data-testid="address-zip" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <div className="flex space-x-4">
                                <Button 
                                  type="submit" 
                                  disabled={createAddressMutation.isPending}
                                  data-testid="save-address"
                                >
                                  {createAddressMutation.isPending ? "Saving..." : "Save Address"}
                                </Button>
                                <Button 
                                  type="button" 
                                  variant="outline"
                                  onClick={() => setEditingAddress(null)}
                                  data-testid="cancel-address"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6 mt-6">
            {/* Notification Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Test Email Notifications</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    Want to see how your email notifications will look? Send yourself a test email!
                  </p>
                  <NotificationTest />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Order Updates</Label>
                    <div className="text-sm text-muted-foreground">
                      Get notified about order confirmations and shipping updates
                    </div>
                  </div>
                  <Switch
                    checked={settings.notifications.orderUpdates}
                    onCheckedChange={(checked) => updateNotificationSetting('orderUpdates', checked)}
                    data-testid="toggle-order-updates"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Promotional Emails</Label>
                    <div className="text-sm text-muted-foreground">
                      Receive special offers and promotional content
                    </div>
                  </div>
                  <Switch
                    checked={settings.notifications.promotionalEmails}
                    onCheckedChange={(checked) => updateNotificationSetting('promotionalEmails', checked)}
                    data-testid="toggle-promotional-emails"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Product Recommendations</Label>
                    <div className="text-sm text-muted-foreground">
                      Get personalized product suggestions
                    </div>
                  </div>
                  <Switch
                    checked={settings.notifications.productRecommendations}
                    onCheckedChange={(checked) => updateNotificationSetting('productRecommendations', checked)}
                    data-testid="toggle-product-recommendations"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Security Alerts</Label>
                    <div className="text-sm text-muted-foreground">
                      Important notifications about account security
                    </div>
                  </div>
                  <Switch
                    checked={settings.notifications.securityAlerts}
                    onCheckedChange={(checked) => updateNotificationSetting('securityAlerts', checked)}
                    data-testid="toggle-security-alerts"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Privacy Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Data Analytics</Label>
                    <div className="text-sm text-muted-foreground">
                      Allow usage data collection for service improvement
                    </div>
                  </div>
                  <Switch
                    checked={settings.privacy.dataAnalytics}
                    onCheckedChange={(checked) => updatePrivacySetting('dataAnalytics', checked)}
                    data-testid="toggle-data-analytics"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Personalized Recommendations</Label>
                    <div className="text-sm text-muted-foreground">
                      Use your browsing history for better recommendations
                    </div>
                  </div>
                  <Switch
                    checked={settings.privacy.personalizedRecommendations}
                    onCheckedChange={(checked) => updatePrivacySetting('personalizedRecommendations', checked)}
                    data-testid="toggle-personalized-recommendations"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Marketing Communications</Label>
                    <div className="text-sm text-muted-foreground">
                      Share your data with marketing partners
                    </div>
                  </div>
                  <Switch
                    checked={settings.privacy.marketingCommunications}
                    onCheckedChange={(checked) => updatePrivacySetting('marketingCommunications', checked)}
                    data-testid="toggle-marketing-communications"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Activity Tracking</Label>
                    <div className="text-sm text-muted-foreground">
                      Track browsing activity for analytics
                    </div>
                  </div>
                  <Switch
                    checked={settings.privacy.activityTracking}
                    onCheckedChange={(checked) => updatePrivacySetting('activityTracking', checked)}
                    data-testid="toggle-activity-tracking"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Two-Factor Authentication</Label>
                    <div className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </div>
                  </div>
                  <Switch
                    checked={settings.security.twoFactorEnabled}
                    onCheckedChange={(checked) => updateSecuritySetting('twoFactorEnabled', checked)}
                    data-testid="toggle-two-factor"
                  />
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Label className="text-base">Password</Label>
                      <div className="text-sm text-muted-foreground">
                        Change your account password
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowPasswordChange(!showPasswordChange)}
                      data-testid="toggle-password-change"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </div>

                  {showPasswordChange && (
                    <Card className="border-2">
                      <CardContent className="pt-6">
                        <Form {...passwordForm}>
                          <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                            <FormField
                              control={passwordForm.control}
                              name="currentPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Current Password</FormLabel>
                                  <FormControl>
                                    <Input type="password" {...field} data-testid="current-password" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={passwordForm.control}
                              name="newPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>New Password</FormLabel>
                                  <FormControl>
                                    <Input type="password" {...field} data-testid="new-password" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={passwordForm.control}
                              name="confirmPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Confirm New Password</FormLabel>
                                  <FormControl>
                                    <Input type="password" {...field} data-testid="confirm-password" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex space-x-2">
                              <Button 
                                type="submit" 
                                disabled={changePasswordMutation.isPending}
                                data-testid="save-password"
                              >
                                {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                              </Button>
                              <Button 
                                type="button" 
                                variant="outline"
                                onClick={() => setShowPasswordChange(false)}
                                data-testid="cancel-password"
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Theme</Label>
                    <div className="text-sm text-muted-foreground">
                      Choose your preferred interface theme
                    </div>
                  </div>
                  <Select 
                    value={settings.preferences.theme} 
                    onValueChange={(value) => updatePreferenceSetting('theme', value)}
                  >
                    <SelectTrigger className="w-32" data-testid="theme-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Language</Label>
                    <div className="text-sm text-muted-foreground">
                      Select your preferred language
                    </div>
                  </div>
                  <Select 
                    value={settings.preferences.language} 
                    onValueChange={(value) => updatePreferenceSetting('language', value)}
                  >
                    <SelectTrigger className="w-32" data-testid="language-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="it">Italiano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Data Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Export Personal Data</Label>
                    <div className="text-sm text-muted-foreground">
                      Download a copy of your personal data and account information
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleDataExport}
                    data-testid="export-data"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Shield className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Delete Account</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                      This will permanently delete your account, orders, addresses, and all associated data.
                    </p>
                    <Button 
                      variant="destructive" 
                      onClick={handleDeleteAccount}
                      disabled={deleteAccountMutation.isPending}
                      data-testid="delete-account"
                    >
                      {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
