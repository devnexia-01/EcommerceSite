import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Package, ArrowLeft, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

export default function ReturnsPage() {
  const { toast } = useToast();
  const [returnForm, setReturnForm] = useState({
    orderNumber: "",
    email: "",
    reason: "",
    description: "",
    items: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setReturnForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!returnForm.orderNumber.trim() || !returnForm.email.trim() || !returnForm.reason) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Return request submitted!",
        description: "We'll email you a return label within 24 hours. Reference: RET-" + Date.now()
      });
      
      // Reset form
      setReturnForm({
        orderNumber: "",
        email: "",
        reason: "",
        description: "",
        items: []
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit return request. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const returnReasons = [
    "Item doesn't fit",
    "Item damaged during shipping",
    "Wrong item received",
    "Item not as described",
    "Changed my mind",
    "Quality not as expected",
    "Ordered wrong size/color",
    "Item arrived too late"
  ];

  const returnSteps = [
    {
      step: 1,
      title: "Request Return",
      description: "Fill out the return form with your order details",
      icon: <Package className="w-6 h-6" />
    },
    {
      step: 2,
      title: "Get Return Label",
      description: "We'll email you a prepaid return shipping label",
      icon: <ArrowLeft className="w-6 h-6" />
    },
    {
      step: 3,
      title: "Ship Items",
      description: "Package items securely and ship using our label",
      icon: <RefreshCw className="w-6 h-6" />
    },
    {
      step: 4,
      title: "Get Refund",
      description: "Receive refund within 5-10 business days after we receive items",
      icon: <CheckCircle className="w-6 h-6" />
    }
  ];

  const policyHighlights = [
    {
      title: "30-Day Window",
      description: "Items can be returned within 30 days of delivery",
      icon: <Clock className="w-5 h-5 text-green-600" />,
      status: "included"
    },
    {
      title: "Original Condition",
      description: "Items must be unused with original tags and packaging",
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      status: "included"
    },
    {
      title: "Free Return Shipping",
      description: "We provide prepaid return labels for most returns",
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      status: "included"
    },
    {
      title: "Final Sale Items",
      description: "Some items like intimate apparel cannot be returned",
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      status: "excluded"
    }
  ];

  const nonReturnableItems = [
    "Intimate apparel and swimwear",
    "Personalized or customized items",
    "Gift cards and digital products",
    "Items damaged by normal wear",
    "Items without original tags",
    "Perishable goods"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Returns & Exchanges</h1>
            <p className="text-xl md:text-2xl text-primary-foreground/80 max-w-3xl mx-auto">
              Easy returns within 30 days. We're committed to making your return experience as smooth as possible.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Tabs defaultValue="return-process" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="return-process">Return Process</TabsTrigger>
            <TabsTrigger value="start-return">Start Return</TabsTrigger>
            <TabsTrigger value="policy">Return Policy</TabsTrigger>
            <TabsTrigger value="track-return">Track Return</TabsTrigger>
          </TabsList>

          <TabsContent value="return-process" className="mt-8">
            {/* Return Process Steps */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-center mb-12">How Returns Work</h2>
              <div className="grid md:grid-cols-4 gap-8">
                {returnSteps.map((step, index) => (
                  <Card key={step.step}>
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4">
                        {step.icon}
                      </div>
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-4">
                        {step.step}
                      </div>
                      <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                      <p className="text-gray-600 text-sm">{step.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Policy Highlights */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-center mb-12">Return Policy Highlights</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {policyHighlights.map((highlight, index) => (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        {highlight.icon}
                        <div>
                          <h3 className="text-lg font-bold mb-2">{highlight.title}</h3>
                          <p className="text-gray-600">{highlight.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Quick Actions */}
            <section>
              <Card>
                <CardContent className="p-8 text-center">
                  <h2 className="text-2xl font-bold mb-6">Ready to Start a Return?</h2>
                  <p className="text-gray-600 mb-8">
                    Have your order number ready and we'll get you started in just a few minutes.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg">
                      Start Return Request
                    </Button>
                    <Button variant="outline" size="lg">
                      Track Existing Return
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          <TabsContent value="start-return" className="mt-8">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Start Your Return</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleReturnSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="orderNumber">Order Number *</Label>
                      <Input
                        id="orderNumber"
                        value={returnForm.orderNumber}
                        onChange={(e) => handleInputChange("orderNumber", e.target.value)}
                        placeholder="e.g., ORD-12345678"
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={returnForm.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="Email used for the order"
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="reason">Reason for Return *</Label>
                      <Select value={returnForm.reason} onValueChange={(value) => handleInputChange("reason", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {returnReasons.map((reason) => (
                            <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="description">Additional Details</Label>
                      <Textarea
                        id="description"
                        value={returnForm.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        placeholder="Please provide any additional details about your return..."
                        className="min-h-[100px]"
                        disabled={isSubmitting}
                      />
                    </div>

                    <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Submitting..." : "Submit Return Request"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="policy" className="mt-8">
            <div className="space-y-8">
              {/* Full Return Policy */}
              <Card>
                <CardHeader>
                  <CardTitle>Complete Return Policy</CardTitle>
                </CardHeader>
                <CardContent className="prose max-w-none">
                  <h3>Return Window</h3>
                  <p>Items may be returned within 30 days of the delivery date. The return window begins from the date you receive your order, not the date you placed it.</p>

                  <h3>Item Condition Requirements</h3>
                  <ul>
                    <li>Items must be in original, unused condition</li>
                    <li>Original tags and labels must be attached</li>
                    <li>Items must be in original packaging when applicable</li>
                    <li>Items should be free from odors, stains, or damage</li>
                  </ul>

                  <h3>Return Shipping</h3>
                  <p>We provide prepaid return shipping labels for most returns within the United States. International return shipping costs may apply and will be deducted from your refund.</p>

                  <h3>Refund Processing</h3>
                  <p>Refunds are processed within 3-5 business days after we receive and inspect your returned items. The refund will be issued to your original payment method. Please allow 5-10 business days for the refund to appear on your statement.</p>

                  <h3>Exchanges</h3>
                  <p>We currently do not offer direct exchanges. To get a different size or color, please return the original item and place a new order for the desired item.</p>
                </CardContent>
              </Card>

              {/* Non-Returnable Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Items That Cannot Be Returned</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {nonReturnableItems.map((item, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Special Circumstances */}
              <Card>
                <CardHeader>
                  <CardTitle>Special Circumstances</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Damaged Items</h4>
                      <p className="text-gray-600">If you receive a damaged item, please contact us immediately with photos. We'll provide a full refund or replacement at no cost to you.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Wrong Item</h4>
                      <p className="text-gray-600">If we sent you the wrong item, we'll arrange for a replacement to be sent immediately and provide a prepaid return label for the incorrect item.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Late Delivery</h4>
                      <p className="text-gray-600">If your order arrives after the promised delivery date due to our error, you may be eligible for a full refund even if you've used the item.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="track-return" className="mt-8">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Track Your Return</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="trackingNumber">Return Tracking Number or Order Number</Label>
                      <Input
                        id="trackingNumber"
                        placeholder="e.g., RET-12345678 or ORD-12345678"
                      />
                    </div>
                    <div>
                      <Label htmlFor="trackingEmail">Email Address</Label>
                      <Input
                        id="trackingEmail"
                        type="email"
                        placeholder="Email used for the return"
                      />
                    </div>
                    <Button size="lg" className="w-full">
                      Track Return
                    </Button>
                  </div>

                  <div className="mt-8 pt-8 border-t">
                    <h3 className="font-semibold mb-4">Return Status Guide</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">Requested</Badge>
                        <span className="text-sm text-gray-600">Return request submitted, awaiting label</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">Label Sent</Badge>
                        <span className="text-sm text-gray-600">Return label emailed to you</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">In Transit</Badge>
                        <span className="text-sm text-gray-600">Package on its way to our facility</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">Received</Badge>
                        <span className="text-sm text-gray-600">We've received and are inspecting your return</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className="bg-green-600">Processed</Badge>
                        <span className="text-sm text-gray-600">Refund issued to your original payment method</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}