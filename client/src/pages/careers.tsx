import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign, Users, Target, Heart, Zap } from "lucide-react";

interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  requirements: string[];
  posted: string;
}

export default function CareersPage() {
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  const jobs: Job[] = [
    {
      id: "1",
      title: "Senior Frontend Developer",
      department: "Engineering",
      location: "San Francisco, CA",
      type: "Full-time",
      salary: "$120k - $160k",
      description: "Join our engineering team to build cutting-edge e-commerce experiences using React, TypeScript, and modern web technologies.",
      requirements: ["5+ years React experience", "TypeScript proficiency", "E-commerce experience preferred", "Bachelor's degree or equivalent"],
      posted: "2 days ago"
    },
    {
      id: "2",
      title: "Product Manager",
      department: "Product",
      location: "New York, NY",
      type: "Full-time",
      salary: "$130k - $170k",
      description: "Lead product strategy and development for our core e-commerce platform. Drive innovation and user experience improvements.",
      requirements: ["3+ years product management", "E-commerce background", "Data-driven decision making", "Strong communication skills"],
      posted: "1 week ago"
    },
    {
      id: "3",
      title: "Customer Success Manager",
      department: "Customer Success",
      location: "Austin, TX",
      type: "Full-time",
      salary: "$70k - $90k",
      description: "Help our customers achieve success with our platform. Build relationships and drive customer satisfaction and retention.",
      requirements: ["2+ years customer success", "Excellent communication", "Problem-solving skills", "SaaS experience preferred"],
      posted: "3 days ago"
    },
    {
      id: "4",
      title: "DevOps Engineer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      salary: "$110k - $140k",
      description: "Build and maintain our cloud infrastructure. Ensure scalability, security, and reliability of our e-commerce platform.",
      requirements: ["AWS/GCP experience", "Kubernetes knowledge", "CI/CD expertise", "Security best practices"],
      posted: "5 days ago"
    },
    {
      id: "5",
      title: "UX/UI Designer",
      department: "Design",
      location: "San Francisco, CA",
      type: "Full-time",
      salary: "$90k - $120k",
      description: "Create beautiful, intuitive user experiences for our e-commerce platform. Work closely with product and engineering teams.",
      requirements: ["3+ years UX/UI design", "Figma proficiency", "E-commerce design experience", "User research skills"],
      posted: "1 week ago"
    },
    {
      id: "6",
      title: "Marketing Specialist",
      department: "Marketing",
      location: "New York, NY",
      type: "Full-time",
      salary: "$60k - $80k",
      description: "Drive growth through digital marketing campaigns. Manage social media, content creation, and performance marketing.",
      requirements: ["2+ years digital marketing", "Social media expertise", "Content creation skills", "Analytics proficiency"],
      posted: "4 days ago"
    }
  ];

  const departments = ["all", "Engineering", "Product", "Design", "Customer Success", "Marketing"];

  const filteredJobs = selectedDepartment === "all" 
    ? jobs 
    : jobs.filter(job => job.department === selectedDepartment);

  const benefits = [
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Competitive Salary",
      description: "Industry-leading compensation packages with equity options"
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Health & Wellness",
      description: "Comprehensive health insurance, dental, vision, and wellness programs"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Flexible Schedule",
      description: "Work-life balance with flexible hours and remote work options"
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Growth Opportunities",
      description: "Professional development, training, and clear career advancement paths"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Amazing Team",
      description: "Work with talented, passionate people in a collaborative environment"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Cutting-edge Tech",
      description: "Work with the latest technologies and tools in e-commerce"
    }
  ];

  const values = [
    {
      title: "Innovation First",
      description: "We embrace new ideas and technologies to stay ahead of the curve"
    },
    {
      title: "Customer Obsession",
      description: "Everything we do is focused on delivering exceptional customer experiences"
    },
    {
      title: "Team Collaboration",
      description: "We believe the best results come from working together"
    },
    {
      title: "Continuous Learning",
      description: "We invest in our team's growth and development"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Join Our Team</h1>
            <p className="text-xl md:text-2xl text-primary-foreground/80 max-w-3xl mx-auto mb-8">
              Build the future of e-commerce with talented people who share your passion for innovation and excellence.
            </p>
            <Button size="lg" variant="secondary">
              View Open Positions
            </Button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Company Values */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index}>
                <CardContent className="p-6 text-center">
                  <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Why Work With Us</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="text-primary mt-1">{benefit.icon}</div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                      <p className="text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Job Listings */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Open Positions</h2>
          
          {/* Department Filter */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {departments.map((dept) => (
              <Button
                key={dept}
                variant={selectedDepartment === dept ? "default" : "outline"}
                onClick={() => setSelectedDepartment(dept)}
                className="capitalize"
              >
                {dept === "all" ? "All Departments" : dept}
              </Button>
            ))}
          </div>

          {/* Job Cards */}
          <div className="space-y-6">
            {filteredJobs.map((job) => (
              <Card key={job.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold mb-2">{job.title}</h3>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="secondary">{job.department}</Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {job.location}
                            </Badge>
                            <Badge variant="outline">{job.type}</Badge>
                            <Badge variant="outline">{job.salary}</Badge>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">{job.posted}</span>
                      </div>
                      
                      <p className="text-gray-700 mb-4">{job.description}</p>
                      
                      <div className="mb-4">
                        <h4 className="font-semibold mb-2">Requirements:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                          {job.requirements.map((req, index) => (
                            <li key={index}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <div className="lg:ml-6 mt-4 lg:mt-0">
                      <Button size="lg">
                        Apply Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No positions available in this department currently.</p>
              <p className="text-gray-500">Check back soon or browse all departments.</p>
            </div>
          )}
        </section>

        {/* Application Process */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Our Hiring Process</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
                <h3 className="text-lg font-bold mb-2">Apply</h3>
                <p className="text-gray-600">Submit your application and resume through our job portal</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
                <h3 className="text-lg font-bold mb-2">Screen</h3>
                <p className="text-gray-600">Initial phone or video screening with our recruiting team</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
                <h3 className="text-lg font-bold mb-2">Interview</h3>
                <p className="text-gray-600">Technical and cultural fit interviews with the team</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">4</div>
                <h3 className="text-lg font-bold mb-2">Offer</h3>
                <p className="text-gray-600">Reference checks and job offer with competitive package</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center">
          <Card>
            <CardContent className="p-12">
              <h2 className="text-3xl font-bold mb-6">Ready to Make an Impact?</h2>
              <p className="text-gray-700 mb-8 max-w-2xl mx-auto">
                Don't see a position that fits? We're always looking for exceptional talent. 
                Send us your resume and we'll keep you in mind for future opportunities.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg">
                  Send General Application
                </Button>
                <Button variant="outline" size="lg">
                  Learn More About Us
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}