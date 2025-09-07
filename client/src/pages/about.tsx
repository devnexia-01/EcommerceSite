import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AboutContent {
  company: {
    name: string;
    founded: string;
    mission: string;
    vision: string;
    values: string[];
  };
  team: {
    size: string;
    locations: string[];
    expertise: string[];
  };
  achievements: string[];
  stats: {
    customers: string;
    products: string;
    countries: string;
    satisfaction: string;
  };
}

export default function AboutPage() {
  const [content, setContent] = useState<AboutContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAboutContent = async () => {
      try {
        const response = await fetch('/api/content/about');
        if (response.ok) {
          const data = await response.json();
          setContent(data);
        }
      } catch (error) {
        console.error('Failed to fetch about content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAboutContent();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Failed to load content. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">About {content.company.name}</h1>
            <p className="text-xl md:text-2xl text-primary-foreground/80 max-w-3xl mx-auto">
              Delivering exceptional shopping experiences with cutting-edge technology and unmatched customer service.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Stats Section */}
        <section className="mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{content.stats.customers}</div>
              <div className="text-gray-600">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{content.stats.products}</div>
              <div className="text-gray-600">Products</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{content.stats.countries}</div>
              <div className="text-gray-600">Countries</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{content.stats.satisfaction}</div>
              <div className="text-gray-600">Satisfaction Rate</div>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="mb-16">
          <div className="grid md:grid-cols-2 gap-12">
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-4 text-primary">Our Mission</h2>
                <p className="text-gray-700 leading-relaxed">{content.company.mission}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-4 text-primary">Our Vision</h2>
                <p className="text-gray-700 leading-relaxed">{content.company.vision}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.company.values.map((value, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <p className="text-gray-700 leading-relaxed">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Team Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Our Team</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-bold mb-2">Team Size</h3>
                <p className="text-primary text-2xl font-bold">{content.team.size}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4">Locations</h3>
                <ul className="space-y-2">
                  {content.team.locations.map((location, index) => (
                    <li key={index} className="text-gray-700">{location}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4">Expertise</h3>
                <ul className="space-y-2">
                  {content.team.expertise.map((skill, index) => (
                    <li key={index} className="text-gray-700">{skill}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Achievements */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Our Achievements</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.achievements.map((achievement, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3 flex-shrink-0"></div>
                    <p className="text-gray-700">{achievement}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* History */}
        <section className="mb-16">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-center mb-8">Our Story</h2>
              <div className="max-w-4xl mx-auto">
                <p className="text-gray-700 leading-relaxed mb-6">
                  Founded in {content.company.founded}, {content.company.name} started with a simple vision: to create an exceptional online shopping experience that puts customers first. From our humble beginnings, we've grown into a leading e-commerce platform serving millions of customers worldwide.
                </p>
                <p className="text-gray-700 leading-relaxed mb-6">
                  Our journey has been marked by continuous innovation, unwavering commitment to quality, and an obsession with customer satisfaction. We've built our reputation on trust, reliability, and delivering products that exceed expectations.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Today, we continue to push boundaries, embracing new technologies and expanding our reach while staying true to our core values. Our team of passionate professionals works tirelessly to ensure every customer interaction is memorable and every product meets our high standards.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Call to Action */}
        <section className="text-center">
          <h2 className="text-3xl font-bold mb-6">Join Our Journey</h2>
          <p className="text-gray-700 mb-8 max-w-2xl mx-auto">
            Ready to be part of something extraordinary? Explore our career opportunities and help us shape the future of e-commerce.
          </p>
          <Button size="lg" className="mr-4">
            View Careers
          </Button>
          <Button variant="outline" size="lg">
            Contact Us
          </Button>
        </section>
      </div>
    </div>
  );
}