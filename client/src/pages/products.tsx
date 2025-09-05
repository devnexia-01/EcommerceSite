import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import ProductCard from "@/components/product/product-card";
import { Filter, Grid, List, ChevronLeft, ChevronRight } from "lucide-react";

export default function Products() {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("created");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const itemsPerPage = 20;

  // Parse URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const search = params.get('search') || '';
    const category = params.get('category') || '';
    
    setSearchQuery(search);
    setSelectedCategory(category);
  }, [location]);

  const { data: categoriesData } = useQuery({
    queryKey: ["/api/categories"]
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["/api/products", {
      search: searchQuery,
      categoryId: selectedCategory,
      sortBy,
      sortOrder,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage
    }]
  });

  const categories = categoriesData || [];
  const products = productsData?.products || [];
  const totalProducts = productsData?.total || 0;
  const totalPages = Math.ceil(totalProducts / itemsPerPage);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);
  };

  const handleSortChange = (value: string) => {
    const [newSortBy, newSortOrder] = value.split('-');
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSortBy("created");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  const getPaginationRange = () => {
    const range = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    
    return range;
  };

  return (
    <div className="min-h-screen bg-background" data-testid="products-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Filters</span>
                  <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="clear-filters">
                    Clear All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div>
                  <Label htmlFor="search" className="text-sm font-medium mb-2 block">
                    Search
                  </Label>
                  <form onSubmit={handleSearch}>
                    <Input
                      id="search"
                      type="text"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="products-search"
                    />
                  </form>
                </div>

                {/* Categories */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Categories</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="category-all"
                        checked={!selectedCategory}
                        onCheckedChange={() => handleCategoryChange("")}
                        data-testid="category-all"
                      />
                      <Label htmlFor="category-all" className="text-sm">All Categories</Label>
                    </div>
                    {categories.map((category: any) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category.id}`}
                          checked={selectedCategory === category.id}
                          onCheckedChange={() => handleCategoryChange(category.id)}
                          data-testid={`category-${category.slug}`}
                        />
                        <Label htmlFor={`category-${category.id}`} className="text-sm">
                          {category.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground" data-testid="products-title">
                  {searchQuery ? `Search results for "${searchQuery}"` : 
                   selectedCategory ? categories.find((c: any) => c.id === selectedCategory)?.name || 'Products' : 
                   'All Products'}
                </h1>
                <p className="text-muted-foreground" data-testid="results-count">
                  Showing {Math.min(products.length, itemsPerPage)} of {totalProducts} products
                </p>
              </div>

              <div className="flex items-center gap-4">
                <Select value={`${sortBy}-${sortOrder}`} onValueChange={handleSortChange} data-testid="sort-select">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created-desc">Newest First</SelectItem>
                    <SelectItem value="created-asc">Oldest First</SelectItem>
                    <SelectItem value="name-asc">Name: A to Z</SelectItem>
                    <SelectItem value="name-desc">Name: Z to A</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="rating-desc">Highest Rated</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex border border-input rounded-lg">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("grid")}
                    data-testid="grid-view"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                    data-testid="list-view"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {(searchQuery || selectedCategory) && (
              <div className="flex items-center gap-2 mb-6">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="gap-2" data-testid="active-search-filter">
                    Search: {searchQuery}
                    <button onClick={() => { setSearchQuery(""); setCurrentPage(1); }}>×</button>
                  </Badge>
                )}
                {selectedCategory && (
                  <Badge variant="secondary" className="gap-2" data-testid="active-category-filter">
                    Category: {categories.find((c: any) => c.id === selectedCategory)?.name}
                    <button onClick={() => { setSelectedCategory(""); setCurrentPage(1); }}>×</button>
                  </Badge>
                )}
              </div>
            )}

            {/* Products Grid/List */}
            {isLoading ? (
              <div className="text-center py-12">
                <LoadingSpinner className="mx-auto mb-4" data-testid="products-loading" />
                <p className="text-muted-foreground">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search or filter criteria
                </p>
                <Button onClick={clearFilters} data-testid="clear-filters-no-results">
                  Clear all filters
                </Button>
              </div>
            ) : (
              <>
                <div className={`grid gap-6 ${
                  viewMode === "grid" 
                    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                    : "grid-cols-1"
                }`}>
                  {products.map((product: any) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2 mt-12">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      data-testid="prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    {getPaginationRange().map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        onClick={() => setCurrentPage(page)}
                        data-testid={`page-${page}`}
                      >
                        {page}
                      </Button>
                    ))}

                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      data-testid="next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
