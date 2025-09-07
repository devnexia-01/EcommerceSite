import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Ruler, User, Shirt, ShoppingBag } from "lucide-react";

interface SizeChart {
  size: string;
  chest?: string;
  waist?: string;
  hips?: string;
  inseam?: string;
  neck?: string;
}

interface ShoeSize {
  us: string;
  uk: string;
  eu: string;
  cm: string;
}

interface SizeGuideData {
  clothing: {
    women: {
      tops: SizeChart[];
      bottoms: SizeChart[];
    };
    men: {
      tops: SizeChart[];
      bottoms: SizeChart[];
    };
  };
  shoes: {
    conversion: ShoeSize[];
  };
  measuring_tips: string[];
}

export default function SizeGuidePage() {
  const [sizeGuide, setSizeGuide] = useState<SizeGuideData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSizeGuide = async () => {
      try {
        const response = await fetch('/api/content/size-guide');
        if (response.ok) {
          const data = await response.json();
          setSizeGuide(data);
        }
      } catch (error) {
        console.error('Failed to fetch size guide:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSizeGuide();
  }, []);

  const measuringGuide = [
    {
      area: "Chest/Bust",
      icon: <User className="w-5 h-5" />,
      instruction: "Measure around the fullest part of your chest, keeping the tape measure level and close to your body."
    },
    {
      area: "Waist",
      icon: <User className="w-5 h-5" />,
      instruction: "Measure around your natural waistline, which is the narrowest part of your torso."
    },
    {
      area: "Hips",
      icon: <User className="w-5 h-5" />,
      instruction: "Measure around the fullest part of your hips, approximately 8 inches below your waistline."
    },
    {
      area: "Inseam",
      icon: <Ruler className="w-5 h-5" />,
      instruction: "Measure from the crotch seam to the bottom of the leg on a well-fitting pair of pants."
    }
  ];

  const fitTips = [
    {
      category: "Tops",
      tips: [
        "If you're between sizes, size up for a more relaxed fit",
        "Consider the fabric - stretchy materials may fit differently",
        "Check sleeve length if you have longer or shorter arms",
        "For layering, consider sizing up one size"
      ]
    },
    {
      category: "Bottoms",
      tips: [
        "Waist measurement is more important than hip measurement for fit",
        "Consider rise preference - high, mid, or low rise",
        "Inseam can often be altered if needed",
        "Check thigh measurements for athletic builds"
      ]
    },
    {
      category: "Shoes",
      tips: [
        "Measure feet in the afternoon when they're largest",
        "Measure both feet - use the larger measurement",
        "Leave about 1/2 inch of space between your longest toe and shoe end",
        "Consider the shoe style - some run large or small"
      ]
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading size guide...</p>
        </div>
      </div>
    );
  }

  if (!sizeGuide) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Failed to load size guide. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Size Guide</h1>
            <p className="text-xl md:text-2xl text-primary-foreground/80 max-w-3xl mx-auto">
              Find your perfect fit with our comprehensive sizing charts and measurement guide.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Tabs defaultValue="measuring" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="measuring">How to Measure</TabsTrigger>
            <TabsTrigger value="women">Women's Sizes</TabsTrigger>
            <TabsTrigger value="men">Men's Sizes</TabsTrigger>
            <TabsTrigger value="shoes">Shoe Sizes</TabsTrigger>
            <TabsTrigger value="fit-tips">Fit Tips</TabsTrigger>
          </TabsList>

          <TabsContent value="measuring" className="mt-8">
            <div className="space-y-8">
              {/* Measuring Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Ruler className="w-6 h-6 mr-2" />
                    How to Take Your Measurements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-8">
                    {measuringGuide.map((guide, index) => (
                      <div key={index} className="border rounded-lg p-6">
                        <div className="flex items-center mb-3">
                          <div className="text-primary mr-3">{guide.icon}</div>
                          <h3 className="text-lg font-semibold">{guide.area}</h3>
                        </div>
                        <p className="text-gray-600">{guide.instruction}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Measuring Tips */}
              <Card>
                <CardHeader>
                  <CardTitle>Measuring Tips for Best Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <ul className="space-y-3">
                      {sizeGuide.measuring_tips.slice(0, Math.ceil(sizeGuide.measuring_tips.length / 2)).map((tip, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="text-gray-700">{tip}</span>
                        </li>
                      ))}
                    </ul>
                    <ul className="space-y-3">
                      {sizeGuide.measuring_tips.slice(Math.ceil(sizeGuide.measuring_tips.length / 2)).map((tip, index) => (
                        <li key={index + Math.ceil(sizeGuide.measuring_tips.length / 2)} className="flex items-start">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="text-gray-700">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Video Guide Placeholder */}
              <Card>
                <CardContent className="p-8 text-center">
                  <Shirt className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-4">Need Visual Help?</h3>
                  <p className="text-gray-600 mb-6">
                    Watch our measurement guide video to see exactly how to take accurate measurements for the best fit.
                  </p>
                  <Button size="lg">
                    Watch Measurement Video
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="women" className="mt-8">
            <div className="space-y-8">
              {/* Women's Tops */}
              <Card>
                <CardHeader>
                  <CardTitle>Women's Tops Size Chart</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-semibold">Size</th>
                          <th className="text-left p-3 font-semibold">Chest (inches)</th>
                          <th className="text-left p-3 font-semibold">Waist (inches)</th>
                          <th className="text-left p-3 font-semibold">Hips (inches)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sizeGuide.clothing.women.tops.map((size, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <Badge variant="outline">{size.size}</Badge>
                            </td>
                            <td className="p-3">{size.chest}</td>
                            <td className="p-3">{size.waist}</td>
                            <td className="p-3">{size.hips}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Women's Bottoms */}
              <Card>
                <CardHeader>
                  <CardTitle>Women's Bottoms Size Chart</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-semibold">Size</th>
                          <th className="text-left p-3 font-semibold">Waist (inches)</th>
                          <th className="text-left p-3 font-semibold">Hips (inches)</th>
                          <th className="text-left p-3 font-semibold">Inseam (inches)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sizeGuide.clothing.women.bottoms.map((size, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <Badge variant="outline">{size.size}</Badge>
                            </td>
                            <td className="p-3">{size.waist}</td>
                            <td className="p-3">{size.hips}</td>
                            <td className="p-3">{size.inseam}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="men" className="mt-8">
            <div className="space-y-8">
              {/* Men's Tops */}
              <Card>
                <CardHeader>
                  <CardTitle>Men's Tops Size Chart</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-semibold">Size</th>
                          <th className="text-left p-3 font-semibold">Chest (inches)</th>
                          <th className="text-left p-3 font-semibold">Waist (inches)</th>
                          <th className="text-left p-3 font-semibold">Neck (inches)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sizeGuide.clothing.men.tops.map((size, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <Badge variant="outline">{size.size}</Badge>
                            </td>
                            <td className="p-3">{size.chest}</td>
                            <td className="p-3">{size.waist}</td>
                            <td className="p-3">{size.neck}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Men's Bottoms */}
              <Card>
                <CardHeader>
                  <CardTitle>Men's Bottoms Size Chart</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-semibold">Waist Size</th>
                          <th className="text-left p-3 font-semibold">Waist (inches)</th>
                          <th className="text-left p-3 font-semibold">Hips (inches)</th>
                          <th className="text-left p-3 font-semibold">Inseam (inches)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sizeGuide.clothing.men.bottoms.map((size, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <Badge variant="outline">{size.size}"</Badge>
                            </td>
                            <td className="p-3">{size.waist}</td>
                            <td className="p-3">{size.hips}</td>
                            <td className="p-3">{size.inseam}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="shoes" className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Shoe Size Conversion Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">US Size</th>
                        <th className="text-left p-3 font-semibold">UK Size</th>
                        <th className="text-left p-3 font-semibold">EU Size</th>
                        <th className="text-left p-3 font-semibold">Length (cm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sizeGuide.shoes.conversion.map((size, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <Badge variant="outline">{size.us}</Badge>
                          </td>
                          <td className="p-3">{size.uk}</td>
                          <td className="p-3">{size.eu}</td>
                          <td className="p-3">{size.cm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold mb-2">📏 How to Measure Your Feet</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                    <li>Stand on a piece of paper with your heel against a wall</li>
                    <li>Mark the longest part of your foot on the paper</li>
                    <li>Measure the distance from the wall to the mark in centimeters</li>
                    <li>Use the larger measurement if your feet are different sizes</li>
                    <li>Measure in the afternoon when feet are largest</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fit-tips" className="mt-8">
            <div className="space-y-8">
              {fitTips.map((category, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ShoppingBag className="w-5 h-5 mr-2" />
                      {category.category} Fit Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {category.tips.map((tip, tipIndex) => (
                        <li key={tipIndex} className="flex items-start">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="text-gray-700">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}

              {/* Size Exchange Policy */}
              <Card>
                <CardHeader>
                  <CardTitle>Size Exchange Policy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-green-50 p-6 rounded-lg">
                    <h4 className="font-semibold mb-3 text-green-800">Free Size Exchanges</h4>
                    <p className="text-green-700 mb-4">
                      Not sure about your size? We offer free size exchanges within 30 days of purchase. 
                      Simply return the item in original condition and we'll send you a different size at no extra cost.
                    </p>
                    <ul className="space-y-2 text-sm text-green-700">
                      <li>• Item must be unworn with original tags</li>
                      <li>• Exchange must be requested within 30 days</li>
                      <li>• We cover return shipping for size exchanges</li>
                      <li>• New size ships immediately upon return receipt</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Styling */}
              <Card>
                <CardContent className="p-8 text-center">
                  <User className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-4">Still Need Help Finding Your Size?</h3>
                  <p className="text-gray-600 mb-6">
                    Our personal styling team can help you find the perfect fit. Get personalized size recommendations based on your measurements and preferences.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg">
                      Chat with a Stylist
                    </Button>
                    <Button variant="outline" size="lg">
                      Size Consultation
                    </Button>
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