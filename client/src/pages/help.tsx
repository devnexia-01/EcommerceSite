import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, ChevronDown, Phone, Mail, MessageCircle, Clock } from "lucide-react";

interface FAQ {
  question: string;
  answer: string;
}

interface HelpCategory {
  id: string;
  title: string;
  faqs: FAQ[];
}

interface HelpContent {
  categories: HelpCategory[];
  contact: {
    phone: string;
    email: string;
    hours: string;
    chat: string;
  };
}

export default function HelpPage() {
  const [content, setContent] = useState<HelpContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchHelpContent = async () => {
      try {
        const response = await fetch('/api/content/help');
        if (response.ok) {
          const data = await response.json();
          setContent(data);
          // Open first category by default
          if (data.categories.length > 0) {
            setOpenCategories([data.categories[0].id]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch help content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHelpContent();
  }, []);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const filteredContent = content ? {
    ...content,
    categories: content.categories.map(category => ({
      ...category,
      faqs: category.faqs.filter(faq => 
        searchQuery === "" || 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(category => category.faqs.length > 0)
  } : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading help center...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Failed to load help content. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Help Center</h1>
            <p className="text-xl md:text-2xl text-primary-foreground/80 max-w-3xl mx-auto mb-8">
              Find answers to common questions and get the support you need.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search for help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg bg-white text-gray-900 border-0"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-4 gap-12">
          {/* Contact Options Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <h2 className="text-2xl font-bold mb-6">Need More Help?</h2>
              
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <Phone className="w-6 h-6 text-primary" />
                      <h3 className="font-semibold">Phone Support</h3>
                    </div>
                    <p className="text-gray-600 mb-3">{content.contact.phone}</p>
                    <Badge variant="outline" className="text-xs">{content.contact.hours}</Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <MessageCircle className="w-6 h-6 text-primary" />
                      <h3 className="font-semibold">Live Chat</h3>
                    </div>
                    <p className="text-gray-600 mb-3">{content.contact.chat}</p>
                    <Button className="w-full">Start Chat</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <Mail className="w-6 h-6 text-primary" />
                      <h3 className="font-semibold">Email Support</h3>
                    </div>
                    <p className="text-gray-600 mb-3">{content.contact.email}</p>
                    <Button variant="outline" className="w-full">Send Email</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <Clock className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">Support Hours</h3>
                    <p className="text-gray-600 text-sm">{content.contact.hours}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* FAQ Content */}
          <div className="lg:col-span-3">
            {searchQuery && (
              <div className="mb-6">
                <p className="text-gray-600">
                  {filteredContent?.categories.reduce((acc, cat) => acc + cat.faqs.length, 0) || 0} results found for "{searchQuery}"
                </p>
              </div>
            )}

            <div className="space-y-6">
              {filteredContent?.categories.map((category) => (
                <Card key={category.id}>
                  <Collapsible 
                    open={openCategories.includes(category.id)}
                    onOpenChange={() => toggleCategory(category.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl">{category.title}</CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">{category.faqs.length} articles</Badge>
                            <ChevronDown className={`w-5 h-5 transition-transform ${
                              openCategories.includes(category.id) ? 'rotate-180' : ''
                            }`} />
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          {category.faqs.map((faq, faqIndex) => (
                            <Card key={faqIndex} className="border-l-4 border-l-primary">
                              <Collapsible>
                                <CollapsibleTrigger asChild>
                                  <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors py-4">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-semibold text-left">{faq.question}</h4>
                                      <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />
                                    </div>
                                  </CardHeader>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <CardContent className="pt-0">
                                    <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                                  </CardContent>
                                </CollapsibleContent>
                              </Collapsible>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>

            {filteredContent?.categories.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <h3 className="text-xl font-semibold mb-4">No results found</h3>
                  <p className="text-gray-600 mb-6">
                    We couldn't find any articles matching your search. Try different keywords or browse our categories above.
                  </p>
                  <Button onClick={() => setSearchQuery("")}>
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Additional Resources */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Additional Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Quick Links</h4>
                    <div className="space-y-2">
                      <Button variant="ghost" className="justify-start w-full">Track My Order</Button>
                      <Button variant="ghost" className="justify-start w-full">Return an Item</Button>
                      <Button variant="ghost" className="justify-start w-full">Update Account Info</Button>
                      <Button variant="ghost" className="justify-start w-full">Payment Methods</Button>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Popular Guides</h4>
                    <div className="space-y-2">
                      <Button variant="ghost" className="justify-start w-full">How to Create an Account</Button>
                      <Button variant="ghost" className="justify-start w-full">Understanding Our Return Policy</Button>
                      <Button variant="ghost" className="justify-start w-full">Shipping Options & Times</Button>
                      <Button variant="ghost" className="justify-start w-full">Size Guide & Fit Tips</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feedback */}
            <Card className="mt-8">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold mb-4">Was this helpful?</h3>
                <p className="text-gray-600 mb-6">
                  Let us know how we can improve our help center.
                </p>
                <div className="flex justify-center space-x-4">
                  <Button>👍 Yes, helpful</Button>
                  <Button variant="outline">👎 Need improvement</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}