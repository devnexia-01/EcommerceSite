import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';

const notificationTypes = [
  { value: 'orderConfirmation', label: 'Order Confirmation' },
  { value: 'orderShipped', label: 'Order Shipped' },
  { value: 'securityAlert', label: 'Security Alert' },
  { value: 'promotionalEmail', label: 'Promotional Email' },
  { value: 'productRecommendation', label: 'Product Recommendation' }
];

export function NotificationTest() {
  const [selectedType, setSelectedType] = useState<string>('');
  const { toast } = useToast();

  const testNotificationMutation = useMutation({
    mutationFn: (type: string) => apiRequest('POST', '/api/notifications/test', { 
      type,
      data: getTestData(type)
    }),
    onSuccess: (data: any) => {
      toast({
        title: "Test Email Sent!",
        description: `${data.type} notification sent successfully. Check your email!`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send test notification",
        variant: "destructive"
      });
    }
  });

  const getTestData = (type: string) => {
    switch (type) {
      case 'orderConfirmation':
        return {
          orderId: 'TEST-ORDER-123',
          orderItems: [
            { name: 'Test Product 1', quantity: 2, price: 29.99 },
            { name: 'Test Product 2', quantity: 1, price: 19.99 }
          ],
          orderTotal: 79.97
        };
      case 'orderShipped':
        return {
          orderId: 'TEST-ORDER-123',
          trackingNumber: 'TEST-TRACK-456789'
        };
      case 'securityAlert':
        return {
          securityAction: 'Test security notification from notification preferences'
        };
      case 'promotionalEmail':
        return {
          promotionTitle: 'Flash Sale - Limited Time!',
          promotionDiscount: '25% OFF',
          promotionCode: 'FLASH25'
        };
      case 'productRecommendation':
        return {
          productName: 'Premium Wireless Headphones',
          productPrice: 99.99
        };
      default:
        return {};
    }
  };

  const handleSendTest = () => {
    if (!selectedType) {
      toast({
        title: "Please select a notification type",
        variant: "destructive"
      });
      return;
    }
    testNotificationMutation.mutate(selectedType);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Test Email Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Notification Type
          </label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue placeholder="Select notification type" />
            </SelectTrigger>
            <SelectContent>
              {notificationTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          onClick={handleSendTest}
          disabled={testNotificationMutation.isPending || !selectedType}
          className="w-full"
          data-testid="send-test-notification"
        >
          {testNotificationMutation.isPending ? 'Sending...' : 'Send Test Email'}
        </Button>
        
        <p className="text-xs text-muted-foreground">
          This will send a test email to your registered email address based on your notification preferences.
        </p>
      </CardContent>
    </Card>
  );
}