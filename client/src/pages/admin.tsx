import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Plus, Edit, Trash2, Package, Users, ShoppingCart, TrendingUp, Search, Filter,
  Shield, Settings, FileText, Image, AlertTriangle, Activity, Database,
  Clock, Eye, Ban, UserMinus, Key, Download, Upload, Server, BarChart3, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertProductSchema, insertCategorySchema, createAdminUserSchema, insertContentSchema } from "@shared/schema";
import { Link } from "wouter";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
  const [isUserDetailsDialogOpen, setIsUserDetailsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const productForm = useForm({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      price: "",
      stock: 0,
      categoryId: "",
      sku: "",
      status: "active"
    }
  });

  const categoryForm = useForm({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      emoji: ""
    }
  });

  const userForm = useForm({
    resolver: zodResolver(createAdminUserSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      roles: [],
      permissions: []
    }
  });

  const contentForm = useForm({
    resolver: zodResolver(insertContentSchema),
    defaultValues: {
      title: "",
      slug: "",
      type: "article",
      status: "draft",
      body: "",
      excerpt: ""
    }
  });

  // Queries
  const { data: productsData = { products: [], total: 0 }, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/v1/products", { limit: 100, search: searchQuery }],
    enabled: isAuthenticated && user?.isAdmin
  });

  const products = (productsData as any)?.data?.products || (productsData as any)?.products || [];

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/v1/admin/orders"],
    enabled: isAuthenticated && user?.isAdmin
  });

  const orders = (ordersData as any)?.data || (ordersData as any) || [];

  const { data: categoriesData } = useQuery({
    queryKey: ["/api/categories"],
    enabled: isAuthenticated && user?.isAdmin
  });

  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  // Admin Dashboard Data
  const { data: dashboardOverview, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/v1/admin/dashboard/overview"],
    enabled: isAuthenticated && user?.isAdmin
  });

  const { data: adminUsersData, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/v1/admin/users", { limit: 50 }],
    enabled: isAuthenticated && user?.isAdmin && activeTab === "users"
  });

  const adminUsers = (adminUsersData as any)?.data || (adminUsersData as any) || [];

  const { data: auditLogsData, isLoading: auditLoading } = useQuery({
    queryKey: ["/api/v1/admin/audit/logs", { limit: 50 }],
    enabled: isAuthenticated && user?.isAdmin && activeTab === "audit"
  });

  const auditLogs = (auditLogsData as any)?.data || (auditLogsData as any) || [];

  const { data: securityLogsData, isLoading: securityLoading } = useQuery({
    queryKey: ["/api/v1/admin/security/threats", { limit: 50 }],
    enabled: isAuthenticated && user?.isAdmin && activeTab === "security"
  });

  const securityLogs = (securityLogsData as any)?.data || (securityLogsData as any) || [];

  const { data: systemHealth, isLoading: systemLoading } = useQuery({
    queryKey: ["/api/v1/admin/dashboard/system-health"],
    enabled: isAuthenticated && user?.isAdmin && activeTab === "system"
  });

  const { data: contentData, isLoading: contentLoading } = useQuery({
    queryKey: ["/api/v1/admin/content", { limit: 50 }],
    enabled: isAuthenticated && user?.isAdmin && activeTab === "content"
  });

  const contentItems = (contentData as any)?.data || (contentData as any) || [];

  const { data: userOrdersData, isLoading: userOrdersLoading } = useQuery({
    queryKey: ["/api/v1/admin/orders", { userId: selectedUser?.id }],
    enabled: isAuthenticated && user?.isAdmin && !!selectedUser?.id && isUserDetailsDialogOpen
  });

  const userOrders = selectedUser ? ((userOrdersData as any)?.data || (userOrdersData as any) || []).filter((order: any) => order.userId === selectedUser.id) : [];

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/v1/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/products"] });
      setIsProductDialogOpen(false);
      productForm.reset();
      toast({ title: "Success", description: "Product created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/v1/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/products"] });
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      productForm.reset();
      toast({ title: "Success", description: "Product updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/v1/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/products"] });
      toast({ title: "Success", description: "Product deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const createContentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/v1/admin/content", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/admin/content"] });
      setIsContentDialogOpen(false);
      contentForm.reset();
      toast({ title: "Success", description: "Content created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsCategoryDialogOpen(false);
      categoryForm.reset();
      setEditingCategory(null);
      toast({ title: "Success", description: "Category created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsCategoryDialogOpen(false);
      categoryForm.reset();
      setEditingCategory(null);
      toast({ title: "Success", description: "Category updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Success", description: "Category deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const createUserMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/v1/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/admin/users"] });
      setIsUserDialogOpen(false);
      userForm.reset();
      toast({ title: "Success", description: "Admin user created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You need admin privileges to access this page
            </p>
            <Button asChild>
              <Link href="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onSubmitProduct = async (data: any) => {
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    const productData = {
      ...data,
      price: parseFloat(data.price),
      stock: parseInt(data.stock) || 0,
      slug,
    };

    if (editingProduct) {
      await updateProductMutation.mutateAsync({ id: editingProduct.id, data: productData });
    } else {
      await createProductMutation.mutateAsync(productData);
    }
  };

  const onSubmitCategory = async (data: any) => {
    if (editingCategory) {
      await updateCategoryMutation.mutateAsync({ id: editingCategory.id, data });
    } else {
      await createCategoryMutation.mutateAsync(data);
    }
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      emoji: category.emoji || ""
    });
    setIsCategoryDialogOpen(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm("Are you sure you want to delete this category? This action cannot be undone.")) {
      await deleteCategoryMutation.mutateAsync(categoryId);
    }
  };

  const onSubmitUser = async (data: any) => {
    await createUserMutation.mutateAsync(data);
  };

  const handleEditProduct = (product: any) => {
    const productWithId = { ...product, id: product.productId || product.id };
    setEditingProduct(productWithId);
    productForm.reset({
      name: product.name,
      description: product.description || "",
      price: product.price,
      stock: product.stock,
      categoryId: product.categoryId || "",
      sku: product.sku || "",
      status: product.status
    });
    setIsProductDialogOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      await deleteProductMutation.mutateAsync(productId);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await apiRequest("PUT", `/api/v1/orders/${orderId}/status`, { status });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/admin/orders"] });
      toast({ title: "Success", description: "Order status updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleViewUser = (userId: string) => {
    const user = adminUsers.find((u: any) => u.id === userId);
    if (user) {
      setSelectedUser(user);
      setIsUserDetailsDialogOpen(true);
    }
  };

  const handleToggleSuspendUser = async (userId: string, currentStatus: string) => {
    const isSuspended = currentStatus === "suspended";
    const action = isSuspended ? "unsuspend" : "suspend";
    const newStatus = isSuspended ? "active" : "suspended";
    
    if (confirm(`Are you sure you want to ${action} this user?`)) {
      try {
        await apiRequest("PUT", `/api/v1/admin/users/${userId}/status`, { status: newStatus });
        queryClient.invalidateQueries({ queryKey: ["/api/v1/admin/users"] });
        toast({ title: "Success", description: `User ${action}ed successfully` });
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Failed to update user status", variant: "destructive" });
      }
    }
  };

  const handleResetPassword = async (userId: string) => {
    const targetUser = adminUsers.find((u: any) => u.id === userId);
    if (targetUser && confirm(`Send password reset email to ${targetUser.email}?`)) {
      try {
        await apiRequest("POST", `/api/v1/admin/users/${userId}/reset-password`);
        toast({ title: "Success", description: "Password reset email sent" });
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Failed to send reset email", variant: "destructive" });
      }
    }
  };

  const handleViewOrder = (orderId: string) => {
    const selectedOrder = orders.find((o: any) => o.id === orderId);
    if (selectedOrder) {
      toast({ 
        title: "Order Details", 
        description: `Order #${selectedOrder.orderNumber}\nTotal: $${parseFloat(selectedOrder.total).toFixed(2)}\nStatus: ${selectedOrder.status}\nItems: ${selectedOrder.orderItems?.length || 0}` 
      });
    }
  };

  const stats = (dashboardOverview as any)?.data ? {
    totalProducts: (dashboardOverview as any).data.totalProducts || 0,
    totalUsers: (dashboardOverview as any).data.totalUsers || 0,
    totalOrders: (dashboardOverview as any).data.totalOrders || 0,
    totalRevenue: (dashboardOverview as any).data.totalRevenue || 0,
    newUsersToday: (dashboardOverview as any).data.newUsersToday || 0,
    ordersToday: (dashboardOverview as any).data.ordersToday || 0,
    revenueToday: (dashboardOverview as any).data.revenueToday || 0,
    totalActiveUsers: (dashboardOverview as any).data.totalActiveUsers || 0
  } : {
    totalProducts: products?.length || 0,
    totalUsers: 0,
    totalOrders: Array.isArray(orders) ? orders.length : 0,
    totalRevenue: Array.isArray(orders) ? orders.reduce((sum: number, order: any) => sum + parseFloat(order.total || 0), 0) : 0,
    newUsersToday: 0,
    ordersToday: 0,
    revenueToday: 0,
    totalActiveUsers: 0
  };

  return (
    <div className="min-h-screen bg-background" data-testid="admin-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your store products, orders, and customers</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview" className="flex items-center gap-2" data-testid="tab-overview">
              <TrendingUp className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2" data-testid="tab-users">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2" data-testid="tab-products">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2" data-testid="tab-orders">
              <ShoppingCart className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2" data-testid="tab-content">
              <FileText className="h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2" data-testid="tab-security">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2" data-testid="tab-audit">
              <Activity className="h-4 w-4" />
              Audit
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2" data-testid="tab-system">
              <Server className="h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-total-users">
                    {stats.totalUsers}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +{stats.newUsersToday} today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-total-orders">
                    {stats.totalOrders}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +{stats.ordersToday} today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-total-revenue">
                    ${stats.totalRevenue.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +${stats.revenueToday.toFixed(2)} today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-active-users">
                    {stats.totalActiveUsers}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last 30 days
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <LoadingSpinner className="mx-auto" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.slice(0, 5).map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>{order.user?.email || 'N/A'}</TableCell>
                          <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{order.status}</Badge>
                          </TableCell>
                          <TableCell>${parseFloat(order.total).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6 mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>User Management</CardTitle>
                <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-user">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Admin User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Admin User</DialogTitle>
                    </DialogHeader>
                    <Form {...userForm}>
                      <form onSubmit={userForm.handleSubmit(onSubmitUser)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={userForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="user-first-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={userForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="user-last-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={userForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input {...field} type="email" data-testid="user-email" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={userForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="user-username" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={userForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input {...field} type="password" data-testid="user-password" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex gap-4 pt-4">
                          <Button type="submit" disabled={createUserMutation.isPending} data-testid="submit-user">
                            {createUserMutation.isPending ? "Creating..." : "Create Admin User"}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {/* Search and Filters */}
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      className="pl-8"
                      data-testid="search-users"
                    />
                  </div>
                  <Select>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {usersLoading ? (
                  <LoadingSpinner className="mx-auto" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(adminUsers) ? adminUsers.map((user: any) => (
                        <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Users className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium">
                                  {user.firstName} {user.lastName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  @{user.username}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.isAdmin ? "default" : "secondary"}>
                              {user.isAdmin ? "Admin" : "User"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                user.accountLocked ? "destructive" : 
                                user.emailVerified ? "default" : "secondary"
                              }
                            >
                              {user.accountLocked ? "Suspended" : 
                               user.emailVerified ? "Active" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.lastLoginAt 
                              ? new Date(user.lastLoginAt).toLocaleDateString()
                              : "Never"
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleViewUser(user.id)}
                                data-testid={`view-user-${user.id}`}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleToggleSuspendUser(user.id, user.status)}
                                data-testid={`suspend-user-${user.id}`}
                              >
                                {user.status === "suspended" ? (
                                  <CheckCircle className="h-3 w-3" />
                                ) : (
                                  <Ban className="h-3 w-3" />
                                )}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleResetPassword(user.id)}
                                data-testid={`reset-password-${user.id}`}
                              >
                                <Key className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6 mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Product Management</CardTitle>
                <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingProduct(null)} data-testid="add-product">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingProduct ? "Edit Product" : "Add New Product"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...productForm}>
                      <form onSubmit={productForm.handleSubmit(onSubmitProduct)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={productForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Product Name</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="product-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={productForm.control}
                            name="sku"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SKU</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="product-sku" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={productForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} data-testid="product-description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={productForm.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Price</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" {...field} data-testid="product-price" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={productForm.control}
                            name="stock"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Stock</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    {...field} 
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    data-testid="product-stock" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={productForm.control}
                            name="categoryId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="product-category">
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Array.isArray(categories) ? categories.map((category: any) => (
                                      <SelectItem key={category.id} value={category.id}>
                                        {category.name}
                                      </SelectItem>
                                    )) : null}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsProductDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit"
                            disabled={createProductMutation.isPending || updateProductMutation.isPending}
                            data-testid="save-product"
                          >
                            {(createProductMutation.isPending || updateProductMutation.isPending) ? "Saving..." : "Save Product"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                      data-testid="search-products"
                    />
                  </div>
                </div>

                {productsLoading ? (
                  <LoadingSpinner className="mx-auto" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products?.map((product: any) => (
                        <TableRow key={product.productId || product.id} data-testid={`product-row-${product.productId || product.id}`}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <img
                                src={product.imageUrl || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40"}
                                alt={product.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {product.description}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{product.sku || "N/A"}</TableCell>
                          <TableCell>{product.category?.name || "Uncategorized"}</TableCell>
                          <TableCell>${parseFloat(product.price).toFixed(2)}</TableCell>
                          <TableCell>{product.stock}</TableCell>
                          <TableCell>
                            <Badge variant={product.status === "active" ? "default" : "secondary"}>
                              {product.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditProduct(product)}
                                data-testid={`edit-product-${product.productId || product.id}`}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteProduct(product.productId || product.id)}
                                data-testid={`delete-product-${product.productId || product.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <LoadingSpinner className="mx-auto" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order: any) => (
                        <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>{order.user?.email || 'N/A'}</TableCell>
                          <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>{order.orderItems?.length || 0} items</TableCell>
                          <TableCell>${parseFloat(order.total).toFixed(2)}</TableCell>
                          <TableCell>
                            <Select
                              value={order.status}
                              onValueChange={(value) => updateOrderStatus(order.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="shipped">Shipped</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewOrder(order.id)}
                              data-testid={`view-order-${order.id}`}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Management Tab */}
          <TabsContent value="content" className="space-y-6 mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Content Management</CardTitle>
                <Dialog open={isContentDialogOpen} onOpenChange={setIsContentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-content">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Content
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Content</DialogTitle>
                    </DialogHeader>
                    <Form {...contentForm}>
                      <form onSubmit={contentForm.handleSubmit((data) => createContentMutation.mutate(data))} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={contentForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Title *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Content title..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={contentForm.control}
                            name="slug"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Slug *</FormLabel>
                                <FormControl>
                                  <Input placeholder="content-slug" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={contentForm.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Type *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="article">Article</SelectItem>
                                    <SelectItem value="page">Page</SelectItem>
                                    <SelectItem value="media">Media</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={contentForm.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="published">Published</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={contentForm.control}
                          name="excerpt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Excerpt</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Brief description or excerpt..." className="min-h-[60px]" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={contentForm.control}
                          name="body"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Content Body</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Content body..." className="min-h-[200px]" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsContentDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createContentMutation.isPending}>
                            {createContentMutation.isPending ? "Creating..." : "Create Content"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search content..."
                      className="pl-8"
                      data-testid="search-content"
                    />
                  </div>
                  <Select>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Content</SelectItem>
                      <SelectItem value="article">Articles</SelectItem>
                      <SelectItem value="page">Pages</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Modified</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contentLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          <LoadingSpinner className="mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : contentItems.length === 0 ? (
                      <TableRow>
                        <TableCell className="text-muted-foreground text-center" colSpan={6}>
                          No content items found. Create your first content item to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      contentItems.map((content: any) => (
                        <TableRow key={content.id}>
                          <TableCell className="font-medium">{content.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {content.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={content.status === 'published' ? 'default' : 'secondary'} className="capitalize">
                              {content.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{content.authorId || 'Unknown'}</TableCell>
                          <TableCell>{content.updatedAt ? new Date(content.updatedAt).toLocaleDateString() : 'Never'}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="ghost">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Threats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {securityLoading ? (
                    <LoadingSpinner className="mx-auto" />
                  ) : (
                    <div className="space-y-2">
                      {securityLogs.data?.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          No security threats detected
                        </p>
                      ) : (
                        securityLogs.data?.slice(0, 5).map((log: any) => (
                          <div key={log.id} className="flex items-center justify-between p-2 rounded border">
                            <div className="flex items-center space-x-2">
                              <AlertTriangle className={`h-4 w-4 ${
                                log.severity === 'high' ? 'text-red-500' : 
                                log.severity === 'medium' ? 'text-yellow-500' : 
                                'text-blue-500'
                              }`} />
                              <div>
                                <p className="text-sm font-medium">{log.type}</p>
                                <p className="text-xs text-muted-foreground">{log.description}</p>
                              </div>
                            </div>
                            <Badge variant={log.resolved ? "default" : "destructive"}>
                              {log.resolved ? "Resolved" : "Active"}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ban className="h-5 w-5" />
                    IP Blacklist
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Input placeholder="IP Address" />
                      <Button size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-muted-foreground text-center py-4">
                      No blocked IP addresses
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Failed Login Attempts</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>User Agent</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-muted-foreground text-center" colSpan={5}>
                        No failed login attempts recorded
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="space-y-6 mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Audit Logs
                </CardTitle>
                <Button variant="outline" data-testid="export-audit">
                  <Download className="h-4 w-4 mr-2" />
                  Export Logs
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search audit logs..."
                      className="pl-8"
                      data-testid="search-audit"
                    />
                  </div>
                  <Select>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {auditLoading ? (
                  <LoadingSpinner className="mx-auto" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.data?.length === 0 ? (
                        <TableRow>
                          <TableCell className="text-muted-foreground text-center" colSpan={6}>
                            No audit logs found
                          </TableCell>
                        </TableRow>
                      ) : (
                        auditLogs.data?.map((log: any) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              {new Date(log.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell>{log.actorName || log.actorId}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.action}</Badge>
                            </TableCell>
                            <TableCell>{log.resource}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {log.context?.ipAddress || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {systemLoading ? (
                    <LoadingSpinner className="mx-auto" />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Database</span>
                        <Badge variant="default">Connected</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Server Status</span>
                        <Badge variant="default">Running</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Memory Usage</span>
                        <span className="text-sm text-muted-foreground">
                          {(systemHealth as any)?.data?.memoryUsage?.toFixed(2) || (systemHealth as any)?.memoryUsage?.toFixed(2) || 0} MB
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Uptime</span>
                        <span className="text-sm text-muted-foreground">
                          {Math.floor(((systemHealth as any)?.data?.serverUptime || (systemHealth as any)?.serverUptime || 0) / 3600)}h{' '}
                          {Math.floor((((systemHealth as any)?.data?.serverUptime || (systemHealth as any)?.serverUptime || 0) % 3600) / 60)}m
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Backup Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button className="w-full" data-testid="create-backup">
                      <Upload className="h-4 w-4 mr-2" />
                      Create Backup
                    </Button>
                    <div className="text-muted-foreground text-center py-4">
                      No recent backups
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Site Name</Label>
                      <Input defaultValue="E-commerce Platform" />
                    </div>
                    <div>
                      <Label>Maintenance Mode</Label>
                      <Select defaultValue="disabled">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="enabled">Enabled</SelectItem>
                          <SelectItem value="disabled">Disabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline">Reset to Defaults</Button>
                    <Button>Save Configuration</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab (Legacy - keeping for backward compatibility) */}
          <TabsContent value="categories" className="space-y-6 mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Category Management</CardTitle>
                <Dialog 
                  open={isCategoryDialogOpen} 
                  onOpenChange={(open) => {
                    setIsCategoryDialogOpen(open);
                    if (!open) {
                      setEditingCategory(null);
                      categoryForm.reset();
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => {
                        setEditingCategory(null);
                        categoryForm.reset();
                      }}
                      data-testid="add-category"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
                    </DialogHeader>
                    <Form {...categoryForm}>
                      <form onSubmit={categoryForm.handleSubmit(onSubmitCategory)} className="space-y-4">
                        <FormField
                          control={categoryForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category Name</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="category-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={categoryForm.control}
                          name="slug"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Slug</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="category-slug" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={categoryForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} data-testid="category-description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={categoryForm.control}
                          name="emoji"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Emoji</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="📱" data-testid="category-emoji" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsCategoryDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit"
                            disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                            data-testid="save-category"
                          >
                            {(createCategoryMutation.isPending || updateCategoryMutation.isPending) 
                              ? "Saving..." 
                              : editingCategory 
                                ? "Update Category" 
                                : "Save Category"
                            }
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category: any) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{category.emoji}</span>
                            <span className="font-medium">{category.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{category.slug}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{category.description}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditCategory(category)}
                              data-testid={`edit-category-${category.id}`}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                              disabled={deleteCategoryMutation.isPending}
                              data-testid={`delete-category-${category.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* User Details Dialog */}
        <Dialog open={isUserDetailsDialogOpen} onOpenChange={setIsUserDetailsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-6">
                {/* User Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">User Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p className="font-medium">{selectedUser.email}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Username</Label>
                        <p className="font-medium">{selectedUser.username || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Full Name</Label>
                        <p className="font-medium">
                          {selectedUser.firstName || selectedUser.lastName 
                            ? `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Status</Label>
                        <Badge variant={selectedUser.status === "active" ? "default" : "secondary"}>
                          {selectedUser.status}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Roles</Label>
                        <p className="font-medium">{selectedUser.roles?.join(', ') || 'None'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Last Login</Label>
                        <p className="font-medium">
                          {selectedUser.lastLoginAt 
                            ? new Date(selectedUser.lastLoginAt).toLocaleString()
                            : 'Never'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Order History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userOrdersLoading ? (
                      <LoadingSpinner className="mx-auto" />
                    ) : userOrders && userOrders.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userOrders.map((order: any) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">{order.orderNumber}</TableCell>
                              <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell>{order.orderItems?.length || 0} items</TableCell>
                              <TableCell>${parseFloat(order.total).toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge variant={order.status === "delivered" ? "default" : "secondary"}>
                                  {order.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">No orders found</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
