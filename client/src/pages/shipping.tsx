import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Clock, MapPin, DollarSign, Package, Globe, Shield, AlertCircle } from "lucide-react";

interface ShippingMethod {
  name: string;
  cost: string;
  time: string;
  description: string;
}

interface ShippingInfo {
  methods: ShippingMethod[];
  policies: string[];
  restrictions: string[];
}

export default function ShippingPage() {
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShippingInfo = async () => {
      try {
        const response = await fetch('/api/content/shipping');
        if (response.ok) {
          const data = await response.json();
          setShippingInfo(data);
        }
      } catch (error) {
        console.error('Failed to fetch shipping info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShippingInfo();
  }, []);

  const shippingFeatures = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure Packaging",
      description: "All items are carefully packaged to prevent damage during transit"
    },
    {
      icon: <Package className="w-6 h-6" />,
      title: "Order Tracking",
      description: "Track your order from warehouse to doorstep with real-time updates"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Fast Processing",
      description: "Orders placed before 2 PM EST ship the same business day"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "International Shipping",
      description: "We ship to over 25 countries worldwide with reliable carriers"
    }
  ];

  const domesticZones = [
    { zone: "Zone 1", regions: "West Coast (CA, OR, WA)", time: "1-2 business days", cost: "Standard rates apply" },
    { zone: "Zone 2", regions: "Mountain West (AZ, CO, ID, MT, NV, NM, UT, WY)", time: "2-3 business days", cost: "Standard rates apply" },
    { zone: "Zone 3", regions: "Midwest (IL, IN, IA, KS, MI, MN, MO, NE, ND, OH, SD, WI)", time: "2-4 business days", cost: "Standard rates apply" },
    { zone: "Zone 4", regions: "South (AL, AR, FL, GA, KY, LA, MS, NC, OK, SC, TN, TX, VA, WV)", time: "3-5 business days", cost: "Standard rates apply" },
    { zone: "Zone 5", regions: "Northeast (CT, DE, ME, MD, MA, NH, NJ, NY, PA, RI, VT)", time: "3-5 business days", cost: "Standard rates apply" }
  ];

  const internationalRegions = [
    { region: "Canada", time: "5-10 business days", cost: "$15.99 - $39.99", duties: "May apply" },
    { region: "Europe (EU)", time: "7-14 business days", cost: "$25.99 - $59.99", duties: "May apply" },
    { region: "United Kingdom", time: "7-14 business days", cost: "$25.99 - $59.99", duties: "May apply" },
    { region: "Australia", time: "10-18 business days", cost: "$35.99 - $79.99", duties: "May apply" },
    { region: "Asia (Japan, S. Korea)", time: "10-18 business days", cost: "$35.99 - $79.99", duties: "May apply" },
    { region: "Other Countries", time: "14-21 business days", cost: "Calculated at checkout", duties: "Customer responsibility" }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading shipping information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Shipping Information</h1>
            <p className="text-xl md:text-2xl text-primary-foreground/80 max-w-3xl mx-auto">
              Fast, reliable shipping worldwide with real-time tracking and secure packaging.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Tabs defaultValue="shipping-options" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="shipping-options">Shipping Options</TabsTrigger>
            <TabsTrigger value="domestic">Domestic Shipping</TabsTrigger>
            <TabsTrigger value="international">International</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
          </TabsList>

          <TabsContent value="shipping-options" className="mt-8">
            {/* Shipping Methods */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-center mb-12">Shipping Methods</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {shippingInfo?.methods.map((method, index) => (
                  <Card key={index} className="relative">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <Truck className="w-8 h-8 text-primary" />
                        {method.name === "Standard Shipping" && (
                          <Badge variant="secondary">Most Popular</Badge>
                        )}
                        {method.name === "Overnight Shipping" && (
                          <Badge className="bg-red-600">Fastest</Badge>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-2">{method.name}</h3>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm">
                          <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                          <span>{method.cost}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Clock className="w-4 h-4 mr-2 text-blue-600" />
                          <span>{method.time}</span>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm">{method.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Shipping Features */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-center mb-12">Why Choose Our Shipping</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {shippingFeatures.map((feature, index) => (
                  <Card key={index}>
                    <CardContent className="p-6 text-center">
                      <div className="text-primary mb-4 flex justify-center">{feature.icon}</div>
                      <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                      <p className="text-gray-600 text-sm">{feature.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Quick Facts */}
            <section>
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Quick Facts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary mb-2">FREE</div>
                      <div className="text-sm text-gray-600">Standard shipping on orders over $50</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary mb-2">2 PM</div>
                      <div className="text-sm text-gray-600">Order cutoff for same-day processing</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary mb-2">25+</div>
                      <div className="text-sm text-gray-600">Countries we ship to worldwide</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          <TabsContent value="domestic" className="mt-8">
            <div className="space-y-8">
              {/* Domestic Shipping Zones */}
              <Card>
                <CardHeader>
                  <CardTitle>Domestic Shipping Zones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {domesticZones.map((zone, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                          <div className="flex-1 mb-2 md:mb-0">
                            <h4 className="font-semibold text-lg">{zone.zone}</h4>
                            <p className="text-gray-600">{zone.regions}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center text-sm mb-1">
                              <Clock className="w-4 h-4 mr-2 text-blue-600" />
                              <span>{zone.time}</span>
                            </div>
                            <div className="flex items-center text-sm">
                              <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                              <span>{zone.cost}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Special Locations */}
              <Card>
                <CardHeader>
                  <CardTitle>Special Locations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Alaska & Hawaii</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>• Additional 3-5 business days</li>
                        <li>• Extra shipping charges apply</li>
                        <li>• Standard and expedited options available</li>
                        <li>• No overnight shipping available</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3">Military Addresses (APO/FPO)</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>• 7-21 business days delivery</li>
                        <li>• Standard shipping rates apply</li>
                        <li>• No expedited options available</li>
                        <li>• Tracking may be limited</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="international" className="mt-8">
            <div className="space-y-8">
              {/* International Shipping Regions */}
              <Card>
                <CardHeader>
                  <CardTitle>International Shipping Regions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {internationalRegions.map((region, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex-1 mb-3 lg:mb-0">
                            <h4 className="font-semibold text-lg flex items-center">
                              <Globe className="w-5 h-5 mr-2 text-primary" />
                              {region.region}
                            </h4>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Delivery Time</span>
                              <div className="font-medium">{region.time}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Shipping Cost</span>
                              <div className="font-medium">{region.cost}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Duties & Taxes</span>
                              <div className="font-medium">{region.duties}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* International Shipping Important Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 text-amber-600" />
                    Important International Shipping Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Customs and Duties</h4>
                      <p className="text-gray-600 text-sm mb-2">
                        International orders may be subject to customs duties, taxes, and fees imposed by the destination country. 
                        These charges are the responsibility of the recipient and are not included in our shipping costs.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Delivery Times</h4>
                      <p className="text-gray-600 text-sm mb-2">
                        International delivery times are estimates and may vary due to customs processing, local holidays, 
                        or other factors beyond our control.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Restricted Items</h4>
                      <p className="text-gray-600 text-sm mb-2">
                        Some items cannot be shipped internationally due to customs restrictions. 
                        These restrictions vary by country and will be noted during checkout.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Address Requirements</h4>
                      <p className="text-gray-600 text-sm">
                        International addresses must include a phone number for customs purposes. 
                        Please ensure your address is complete and accurate to avoid delays.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="policies" className="mt-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Shipping Policies */}
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Policies</CardTitle>
                </CardHeader>
                <CardContent>
                  {shippingInfo?.policies && (
                    <ul className="space-y-3">
                      {shippingInfo.policies.map((policy, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="text-gray-700">{policy}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Shipping Restrictions */}
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Restrictions</CardTitle>
                </CardHeader>
                <CardContent>
                  {shippingInfo?.restrictions && (
                    <ul className="space-y-3">
                      {shippingInfo.restrictions.map((restriction, index) => (
                        <li key={index} className="flex items-start">
                          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                          <span className="text-gray-700">{restriction}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Contact for Shipping Questions */}
            <Card className="mt-8">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold mb-4">Questions About Shipping?</h3>
                <p className="text-gray-600 mb-6">
                  Our customer service team is here to help with any shipping questions or concerns.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg">
                    <Phone className="w-4 h-4 mr-2" />
                    Call 1-800-555-0123
                  </Button>
                  <Button variant="outline" size="lg">
                    <MapPin className="w-4 h-4 mr-2" />
                    Track Your Order
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}