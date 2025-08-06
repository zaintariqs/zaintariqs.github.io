import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Star, MessageCircle, Filter } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Sample data - in a real app, this would come from an API
const products = [
  {
    id: 1,
    name: "Organic Tomatoes",
    farmer: "John's Farm",
    location: "California, USA",
    price: 3.50,
    unit: "per lb",
    image: "https://images.unsplash.com/photo-1546470427-e2397e174a2b?w=400&h=300&fit=crop",
    rating: 4.8,
    category: "Vegetables",
    organic: true,
    inStock: true,
    description: "Fresh, vine-ripened organic tomatoes"
  },
  {
    id: 2,
    name: "Fresh Apples",
    farmer: "Sunrise Orchards",
    location: "Washington, USA",
    price: 2.25,
    unit: "per lb",
    image: "https://images.unsplash.com/photo-1569982175971-d92b01cf8694?w=400&h=300&fit=crop",
    rating: 4.9,
    category: "Fruits",
    organic: false,
    inStock: true,
    description: "Crisp and sweet apples, perfect for snacking"
  },
  {
    id: 3,
    name: "Organic Lettuce",
    farmer: "Green Valley Farm",
    location: "Oregon, USA",
    price: 2.00,
    unit: "per head",
    image: "https://images.unsplash.com/photo-1622313762347-3c09fe5c2dd1?w=400&h=300&fit=crop",
    rating: 4.7,
    category: "Vegetables",
    organic: true,
    inStock: true,
    description: "Fresh, crispy organic lettuce heads"
  },
  {
    id: 4,
    name: "Sweet Strawberries",
    farmer: "Berry Bliss Farm",
    location: "Florida, USA",
    price: 4.50,
    unit: "per pint",
    image: "https://images.unsplash.com/photo-1464207687429-7505649dae38?w=400&h=300&fit=crop",
    rating: 4.9,
    category: "Fruits",
    organic: true,
    inStock: false,
    description: "Sweet, juicy strawberries - seasonal availability"
  },
  {
    id: 5,
    name: "Baby Carrots",
    farmer: "Harvest Moon Farm",
    location: "Michigan, USA",
    price: 1.75,
    unit: "per lb",
    image: "https://images.unsplash.com/photo-1598962486512-e8b1be6d1bb5?w=400&h=300&fit=crop",
    rating: 4.6,
    category: "Vegetables",
    organic: false,
    inStock: true,
    description: "Tender baby carrots, perfect for snacking"
  },
  {
    id: 6,
    name: "Fresh Basil",
    farmer: "Herb Haven",
    location: "California, USA",
    price: 2.50,
    unit: "per bunch",
    image: "https://images.unsplash.com/photo-1618375569909-3c8616cf7733?w=400&h=300&fit=crop",
    rating: 4.8,
    category: "Herbs",
    organic: true,
    inStock: true,
    description: "Aromatic fresh basil, grown organically"
  }
];

const Browse = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const categories = ["all", "Vegetables", "Fruits", "Herbs"];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.farmer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-12 space-y-8">
        {/* Page Header */}
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold">Browse Fresh Products</h1>
          <p className="text-xl text-muted-foreground">
            Discover fresh produce directly from local farmers
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products or farmers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === "all" ? "All Categories" : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              className="md:w-auto"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Additional Filters */}
          {showFilters && (
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Price Range</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Any Price" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Price</SelectItem>
                      <SelectItem value="under-2">Under $2</SelectItem>
                      <SelectItem value="2-5">$2 - $5</SelectItem>
                      <SelectItem value="over-5">Over $5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Certification</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="organic">Organic Only</SelectItem>
                      <SelectItem value="conventional">Conventional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Availability</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="in-stock">In Stock Only</SelectItem>
                      <SelectItem value="pre-order">Available for Pre-order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Showing {filteredProducts.length} of {products.length} products
          </p>
          
          <Select defaultValue="relevant">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevant">Most Relevant</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="group hover:shadow-medium transition-all duration-300">
              <div className="relative">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                {product.organic && (
                  <Badge className="absolute top-2 left-2 bg-success text-white">
                    Organic
                  </Badge>
                )}
                {!product.inStock && (
                  <Badge variant="destructive" className="absolute top-2 right-2">
                    Out of Stock
                  </Badge>
                )}
              </div>
              
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{product.description}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{product.farmer}</span>
                  <span className="text-sm text-muted-foreground">• {product.location}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="text-sm font-medium">{product.rating}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      ${product.price.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">{product.unit}</div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="p-4 pt-0 space-y-2">
                <div className="flex space-x-2 w-full">
                  <Button 
                    className="flex-1" 
                    disabled={!product.inStock}
                  >
                    {product.inStock ? "Contact Farmer" : "Notify When Available"}
                  </Button>
                  <Button variant="outline" size="icon">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-lg font-medium mb-2">No products found</div>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filters to find what you're looking for.
            </p>
            <Button onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}>
              Clear Filters
            </Button>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Browse;