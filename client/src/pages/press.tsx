import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, Calendar, Award, TrendingUp, Users } from "lucide-react";

interface PressRelease {
  id: string;
  title: string;
  date: string;
  category: string;
  excerpt: string;
  content: string;
  featured?: boolean;
}

interface MediaAsset {
  type: "logo" | "photo" | "document";
  name: string;
  description: string;
  downloadUrl: string;
  format: string;
  size?: string;
}

export default function PressPage() {
  const pressReleases: PressRelease[] = [
    {
      id: "1",
      title: "EliteCommerce Reaches 1 Million Active Users Milestone",
      date: "2024-01-15",
      category: "Company News",
      excerpt: "Leading e-commerce platform celebrates major user growth milestone with 98.5% customer satisfaction rate.",
      content: "EliteCommerce today announced it has reached one million active users, representing a 200% year-over-year growth...",
      featured: true
    },
    {
      id: "2",
      title: "New AI-Powered Recommendation Engine Launches",
      date: "2024-01-10",
      category: "Product Launch",
      excerpt: "Revolutionary machine learning technology personalizes shopping experience for millions of customers.",
      content: "Our new AI recommendation engine uses advanced machine learning algorithms to provide personalized product suggestions..."
    },
    {
      id: "3",
      title: "EliteCommerce Wins 'Best E-commerce Platform 2024' Award",
      date: "2024-01-05",
      category: "Awards",
      excerpt: "Industry recognition for innovation, customer service excellence, and platform reliability.",
      content: "We are honored to receive the 'Best E-commerce Platform 2024' award from the Digital Commerce Association..."
    },
    {
      id: "4",
      title: "Expanding International Shipping to 10 New Countries",
      date: "2023-12-20",
      category: "Expansion",
      excerpt: "Global expansion continues with new shipping partnerships across Europe and Asia.",
      content: "EliteCommerce today announced the expansion of international shipping services to 10 additional countries..."
    },
    {
      id: "5",
      title: "Partnership with Leading Sustainable Brands Initiative",
      date: "2023-12-15",
      category: "Partnerships",
      excerpt: "Commitment to sustainability through exclusive partnerships with eco-friendly brands.",
      content: "As part of our commitment to environmental responsibility, EliteCommerce has partnered with leading sustainable brands..."
    }
  ];

  const mediaAssets: MediaAsset[] = [
    {
      type: "logo",
      name: "EliteCommerce Logo Package",
      description: "Complete logo package including primary, secondary, and wordmark versions",
      downloadUrl: "/media/logo-package.zip",
      format: "ZIP",
      size: "2.5 MB"
    },
    {
      type: "photo",
      name: "Executive Team Photos",
      description: "High-resolution photos of company leadership team",
      downloadUrl: "/media/executive-photos.zip",
      format: "ZIP",
      size: "15 MB"
    },
    {
      type: "photo",
      name: "Office and Team Photos",
      description: "Company culture and office environment photos",
      downloadUrl: "/media/office-photos.zip",
      format: "ZIP",
      size: "25 MB"
    },
    {
      type: "document",
      name: "Company Fact Sheet",
      description: "Key facts, figures, and company information",
      downloadUrl: "/media/fact-sheet.pdf",
      format: "PDF",
      size: "1.2 MB"
    },
    {
      type: "document",
      name: "Brand Guidelines",
      description: "Complete brand identity and usage guidelines",
      downloadUrl: "/media/brand-guidelines.pdf",
      format: "PDF",
      size: "8 MB"
    }
  ];

  const achievements = [
    {
      icon: <Users className="w-8 h-8" />,
      metric: "1M+",
      label: "Active Users",
      description: "Growing customer base"
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      metric: "200%",
      label: "YoY Growth",
      description: "Year-over-year expansion"
    },
    {
      icon: <Award className="w-8 h-8" />,
      metric: "98.5%",
      label: "Satisfaction",
      description: "Customer satisfaction rate"
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      metric: "24/7",
      label: "Support",
      description: "Customer service availability"
    }
  ];

  const getIconForAssetType = (type: string) => {
    switch (type) {
      case "logo":
        return "🎨";
      case "photo":
        return "📸";
      case "document":
        return "📄";
      default:
        return "📁";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Press Center</h1>
            <p className="text-xl md:text-2xl text-primary-foreground/80 max-w-3xl mx-auto">
              Stay updated with the latest news, announcements, and media resources from EliteCommerce.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Company Achievements */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Company Highlights</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {achievements.map((achievement, index) => (
              <Card key={index}>
                <CardContent className="p-6 text-center">
                  <div className="text-primary mb-4 flex justify-center">{achievement.icon}</div>
                  <div className="text-3xl font-bold text-primary mb-2">{achievement.metric}</div>
                  <div className="font-semibold mb-1">{achievement.label}</div>
                  <div className="text-sm text-gray-600">{achievement.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Press Releases */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-12">Latest News & Press Releases</h2>
          
          <div className="space-y-6">
            {pressReleases.map((release) => (
              <Card key={release.id} className={release.featured ? "border-primary" : ""}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {release.featured && <Badge className="bg-primary">Featured</Badge>}
                        <Badge variant="outline">{release.category}</Badge>
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(release.date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold mb-3">{release.title}</h3>
                      <p className="text-gray-700 mb-4">{release.excerpt}</p>
                    </div>
                    
                    <div className="lg:ml-6 mt-4 lg:mt-0 flex gap-2">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Read More
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Media Resources */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-12">Media Resources</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mediaAssets.map((asset, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-2xl">{getIconForAssetType(asset.type)}</div>
                    <Badge variant="outline">{asset.format}</Badge>
                  </div>
                  
                  <h3 className="font-semibold mb-2">{asset.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{asset.description}</p>
                  
                  <div className="flex items-center justify-between">
                    {asset.size && (
                      <span className="text-xs text-gray-500">{asset.size}</span>
                    )}
                    <Button size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Contact Information */}
        <section className="mb-16">
          <div className="grid lg:grid-cols-2 gap-12">
            <Card>
              <CardHeader>
                <CardTitle>Media Inquiries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-1">Press Contact</h4>
                    <p className="text-gray-600">Sarah Johnson</p>
                    <p className="text-gray-600">Head of Communications</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Email</h4>
                    <p className="text-gray-600">press@elitecommerce.com</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Phone</h4>
                    <p className="text-gray-600">1-800-555-0123 ext. 2</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Response Time</h4>
                    <p className="text-gray-600">Within 24 hours for media inquiries</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Investor Relations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-1">Investor Contact</h4>
                    <p className="text-gray-600">Michael Chen</p>
                    <p className="text-gray-600">Director of Investor Relations</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Email</h4>
                    <p className="text-gray-600">investors@elitecommerce.com</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Phone</h4>
                    <p className="text-gray-600">1-800-555-0123 ext. 3</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Quarterly Reports</h4>
                    <p className="text-gray-600">Available on investor portal</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Newsletter Signup */}
        <section>
          <Card>
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-6">Stay Updated</h2>
              <p className="text-gray-700 mb-8 max-w-2xl mx-auto">
                Subscribe to our press newsletter to receive the latest company news, 
                product announcements, and media resources directly in your inbox.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg">
                  Subscribe to Press Updates
                </Button>
                <Button variant="outline" size="lg">
                  RSS Feed
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}