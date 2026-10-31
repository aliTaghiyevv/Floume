import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpDown,
  ChevronDown,
  Check,
  Instagram,
  MessageCircle,
  Send,
  ShieldCheck,
  Star,
  StarOff,
  Trash2,
  X,
  Youtube,
} from "lucide-react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Flower,
  Grid2X2,
  Heart,
  Home,
  Minus,
  MoveHorizontal,
  MoveVertical,
  Plus,
  Search,
  Share,
  ShoppingCart,
  Store,
  UserCircle,
  Zap,
} from "./components/icons";
import catalogData from "./catalog.json";
import BouquetAssistant from "./components/BouquetAssistant";
import BouquetCustomizer from "./components/BouquetCustomizer";
import type { CustomBouquet } from "./components/BouquetCustomizer";
import "./bouquet-flows.css";

type Product = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images: string[];
  categoryIds: string[];
  rating: number;
  stockLabel: string;
  stock: number;
  similarIds?: string[];
  storeProductIds?: string[];
  description: string;
  storeId: string;
  storeName: string;
  storeImage: string;
  width?: string;
  height?: string;
};
type Category = { id: string; name: string; image: string };
type Section = {
  name: string;
  categories: Category[];
  productHeading: string;
  productIds: string[];
};
const catalog = catalogData as unknown as {
  branding: Record<string, string>;
  banners: { id: string; image: string; alt: string }[];
  sections: Section[];
  products: Product[];
};
const { branding, sections, products, banners } = catalog;
const money = (value: number) => `₼${value.toFixed(2)}`;
const productPath = (p: Product) => `/en/products/${p.id}`;
const productById = (id: string) => products.find((p) => p.id === id);
type Cart = Record<string, number>;
type Modal =
  | "signin"
  | "categories"
  | "checkout"
  | "help"
  | "ai"
  | "customize"
  | null;
const AppContext = createContext<{
  navigate: (url: string) => void;
  modal: (type: Modal) => void;
  favorites: string[];
  favorite: (id: string) => void;
  cart: Cart;
  customBouquets: CustomBouquet[];
  updateCustom: (id: string, quantity: number) => void;
  add: (p: Product, n: number) => void;
  updateCart: (id: string, n: number) => void;
  notify: (text: string) => void;
}>(null!);
const useStore = () => useContext(AppContext);

function Link({
  href = "/en/",
  children,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { navigate } = useStore();
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          !event.defaultPrevented &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          event.button === 0 &&
          href.startsWith("/")
        ) {
          event.preventDefault();
          navigate(href);
        }
      }}
    >
      {children}
    </a>
  );
}
function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null") ?? initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}
function AIIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M8 16v-6a2 2 0 1 1 4 0v6M8 13h4M16 8v8" />
    </svg>
  );
}
function Header({
  productPage,
  location,
}: {
  productPage: boolean;
  location: string;
}) {
  const { modal, cart, customBouquets, navigate } = useStore();
  const [query, setQuery] = useState("");
  const count =
    Object.values(cart).reduce((a, b) => a + b, 0) +
    customBouquets.reduce((n, b) => n + b.quantity, 0);
  useEffect(() => {
    setQuery(new URLSearchParams(location.split("?")[1]).get("q") || "");
  }, [location]);
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link aria-label="Floume Marketplace" className="brand">
            <img
              className="logo-wide"
              src={branding.logo}
              alt="Floume Marketplace"
            />
            <img
              className="logo-flower"
              src={branding.logoIcon}
              alt="Floume Marketplace"
            />
          </Link>
          <button
            className="pill header-categories"
            onClick={() => modal("categories")}
          >
            <Grid2X2 size={19} />
            Categories
          </button>
          <form
            className="search-form"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/en/search?q=${encodeURIComponent(query.trim())}`);
            }}
          >
            <input
              aria-label="Search products or stores"
              placeholder="Search products or stores"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                className="search-clear"
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                <X size={16} />
              </button>
            )}
            <button type="submit" aria-label="Search">
              <Search size={20} />
            </button>
          </form>
          <div className="header-actions">
            <Link href="/en/cart" className="header-cart">
              <ShoppingCart size={20} />
              <span>My cart</span>
              {count > 0 && <b className="cart-count">{count}</b>}
            </Link>
            <button
              className="icon-button account-button"
              aria-label="My account"
              onClick={() => modal("signin")}
            >
              <UserCircle size={22} />
            </button>
          </div>
        </div>
      </header>
      <div className={`store-rail ${productPage ? "product-rail" : ""}`}>
        <div className="container">
          <Link href="/en/stores" className="pill">
            <Store size={20} />
            Stores
          </Link>
          <span className="rail-divider" />
        </div>
      </div>
    </>
  );
}
function FloatingNavigation() {
  const { modal, cart, customBouquets } = useStore();
  const count =
    Object.values(cart).reduce((a, b) => a + b, 0) +
    customBouquets.reduce((n, b) => n + b.quantity, 0);
  return (
    <>
      <nav className="mobile-navigation" aria-label="Mobile navigation">
        <div className="dock-main">
          <Link className="round-button" aria-label="Home">
            <Home />
          </Link>
          <button
            className="round-button"
            aria-label="Categories"
            onClick={() => modal("categories")}
          >
            <Grid2X2 />
          </button>
          <Link href="/en/cart" className="round-button" aria-label="My cart">
            <ShoppingCart />
            {count > 0 && <b className="dock-count">{count}</b>}
          </Link>
        </div>
        <div className="dock-ai">
          <button
            className="round-button"
            aria-label="Customize"
            onClick={() => modal("customize")}
          >
            <Flower />
          </button>
          <button
            className="round-button"
            aria-label="AI"
            onClick={() => modal("ai")}
          >
            <AIIcon />
          </button>
        </div>
      </nav>
      <div className="desktop-ai">
        <button
          className="round-button"
          aria-label="Customize"
          onClick={() => modal("customize")}
        >
          <Flower />
        </button>
        <button
          className="round-button"
          aria-label="AI"
          onClick={() => modal("ai")}
        >
          <AIIcon />
        </button>
      </div>
    </>
  );
}
function ProductCard({ product: p }: { product: Product }) {
  const { favorites, favorite } = useStore();
  const saved = favorites.includes(p.id);
  return (
    <article className="product-card">
      <Link href={productPath(p)} className="product-card-link">
        <div className="card-image">
          <img
            src={p.image}
            alt={`${p.name} - image 1`}
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="card-description">
          <div className="card-price">
            <strong>{money(p.price)}</strong>
            {p.originalPrice && <del>{money(p.originalPrice)}</del>}
          </div>
          <h3>{p.name}</h3>
          {p.rating > 0 && (
            <div className="card-rating">
              <Star size={14} fill="currentColor" />
              {p.rating.toFixed(1)}
            </div>
          )}
        </div>
      </Link>
      <button
        className={`card-heart ${saved ? "is-saved" : ""}`}
        aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={saved}
        onClick={() => favorite(p.id)}
      >
        <Heart size={20} fill={saved ? "currentColor" : "none"} />
      </button>
    </article>
  );
}
function ProductGrid({ items }: { items: Product[] }) {
  return (
    <div className="product-grid">
      {items.map((p) => (
        <ProductCard product={p} key={p.id} />
      ))}
    </div>
  );
}
function CategoryCarousel({ categories }: { categories: Category[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({
    left: true,
    right: categories.length < 6,
  });
  function update() {
    const el = ref.current;
    if (el)
      setPosition({
        left: el.scrollLeft < 2,
        right: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
      });
  }
  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [categories]);
  return (
    <div className="category-carousel">
      <div className="category-track" ref={ref} onScroll={update}>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/en/categories/${c.id}`}
            className="category-tile"
          >
            <img src={c.image} alt={c.name} loading="lazy" />
            <span>{c.name}</span>
          </Link>
        ))}
      </div>
      {!position.right && (
        <button
          className="carousel-arrow arrow-next"
          aria-label="Next slide"
          onClick={() =>
            ref.current?.scrollBy({
              left: ref.current.clientWidth * 0.75,
              behavior: "smooth",
            })
          }
        >
          <ChevronRight size={21} />
        </button>
      )}
      {categories.length > 5 && (
        <button
          className="carousel-arrow arrow-prev"
          disabled={position.left}
          aria-label="Previous slide"
          onClick={() =>
            ref.current?.scrollBy({
              left: -ref.current.clientWidth * 0.75,
              behavior: "smooth",
            })
          }
        >
          <ChevronLeft size={21} />
        </button>
      )}
    </div>
  );
}
function BannerCarousel() {
  const ref = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  return (
    <div className="banner-carousel">
      <div
        className="banner-track"
        ref={ref}
        onScroll={() => {
          const el = ref.current;
          if (el) setSlide(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {banners.map((b, i) => (
          <Link href={`/en/banners/${b.id}`} className="banner" key={b.id}>
            <img
              src={b.image}
              alt={
                i === 0
                  ? "Flowers, gift boxes, sweets, perfumes, plush and balloons, home and lifestyle"
                  : "10% off your first order with WELCOME10"
              }
              fetchPriority="high"
            />
          </Link>
        ))}
      </div>
      <div className="banner-dots">
        {banners.map((b, i) => (
          <button
            key={b.id}
            className={slide === i ? "active" : ""}
            aria-label={`Go to banner ${i + 1}`}
            aria-current={slide === i ? "true" : undefined}
            onClick={() =>
              ref.current?.scrollTo({
                left: ref.current.clientWidth * i,
                behavior: "smooth",
              })
            }
          />
        ))}
      </div>
    </div>
  );
}
function HomePage() {
  return (
    <main className="container home-page">
      <BannerCarousel />
      {sections.map((section) => (
        <section className="catalog-section" key={section.name}>
          <h2 className="section-title">{section.name}</h2>
          <CategoryCarousel categories={section.categories} />
          {section.productIds.length > 0 && (
            <>
              <div className="section-subheader">
                <h2>{section.productHeading}</h2>
                <Link
                  href={`/en/categories/${section.categories[0]?.id}`}
                  className="pill view-all"
                >
                  View all products
                  <ArrowRight size={19} />
                </Link>
              </div>
              <ProductGrid
                items={section.productIds
                  .map(productById)
                  .filter((p): p is Product => !!p)}
              />
              <Link
                className="show-more"
                href={`/en/categories/${section.categories[0]?.id}`}
              >
                Show more
              </Link>
            </>
          )}
        </section>
      ))}
    </main>
  );
}
function Quantity({
  quantity,
  setQuantity,
  max = 99,
}: {
  quantity: number;
  setQuantity: (n: number) => void;
  max?: number;
}) {
  return (
    <div className="quantity-control">
      <button
        aria-label="Decrement"
        disabled={quantity <= 1}
        onClick={() => setQuantity(Math.max(1, quantity - 1))}
      >
        <Minus size={18} />
      </button>
      <output data-testid="quantity" aria-label="Quantity">
        {quantity}
      </output>
      <button
        aria-label="Increment"
        disabled={quantity >= max}
        onClick={() => setQuantity(Math.min(max, quantity + 1))}
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
function ProductPage({ product: p }: { product: Product }) {
  const { favorites, favorite, add, navigate, notify } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [image, setImage] = useState(0);
  const [zoom, setZoom] = useState(false);
  const saved = favorites.includes(p.id);
  const section = sections.find((s) => s.productIds.includes(p.id));
  const similar =
    (p.similarIds?.length ? p.similarIds : section?.productIds)
      ?.map(productById)
      .filter((x): x is Product => !!x) || products.slice(0, 8);
  const storeProducts = p.storeProductIds?.length
    ? p.storeProductIds.map(productById).filter((x): x is Product => !!x)
    : products.filter((x) => x.storeId === p.storeId).slice(0, 8);
  useEffect(() => {
    setQuantity(1);
    setImage(0);
    setZoom(false);
  }, [p.id]);
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify("Product link copied");
    } catch {
      notify("Copy the address above to share this product");
    }
  }
  return (
    <main className="container product-page">
      <section className="product-layout">
        <div className="product-gallery">
          <div className="gallery-sticky">
            <button
              className="main-product-image"
              onClick={() => setZoom(true)}
              aria-label={`Enlarge ${p.name} image`}
            >
              <img
                src={p.images[image] || p.image}
                alt={`${p.name} - image ${image + 1}`}
                fetchPriority="high"
              />
            </button>
            <div className="gallery-actions">
              <button
                className={`round-button ${saved ? "is-saved" : ""}`}
                aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
                aria-pressed={saved}
                onClick={() => favorite(p.id)}
              >
                <Heart fill={saved ? "currentColor" : "none"} />
              </button>
              <button
                className="round-button"
                aria-label="Share"
                onClick={share}
              >
                <Share />
              </button>
            </div>
            {p.images.length > 1 && (
              <div className="gallery-thumbnails">
                {p.images.map((src, i) => (
                  <button
                    className={image === i ? "active" : ""}
                    aria-label={`View image ${i + 1}`}
                    key={src}
                    onClick={() => setImage(i)}
                  >
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="product-details">
          <div className="product-intro">
            <span
              className={`stock-badge ${p.stock > 5 ? "regular-stock" : ""}`}
            >
              <i />
              {p.stockLabel}
            </span>
            <h1>{p.name}</h1>
            {p.description && (
              <p className="product-description">{p.description}</p>
            )}
            <div className="product-rating">
              <span
                className="stars"
                aria-label={p.rating ? `${p.rating} out of 5` : "Not rated"}
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={18}
                    fill="currentColor"
                    className={p.rating ? "rated" : ""}
                  />
                ))}
              </span>
              <a href="#reviews">
                {p.rating ? "5.0 · " : ""}
                {p.rating ? "Product reviews" : "0 ratings"}
              </a>
            </div>
          </div>
          <div className="price-quantity">
            <div>
              <span className="detail-price">{money(p.price)}</span>
              {p.originalPrice && (
                <del className="original-price">{money(p.originalPrice)}</del>
              )}
            </div>
            <Quantity
              quantity={quantity}
              setQuantity={setQuantity}
              max={p.stock}
            />
          </div>
          <div className="purchase-actions">
            <button className="primary-button" onClick={() => add(p, quantity)}>
              <ShoppingCart size={21} />
              Add to cart
            </button>
            <button
              className="outline-button"
              onClick={() => {
                add(p, quantity);
                navigate("/en/cart");
              }}
            >
              <Zap size={21} />
              Buy now <span className="buy-separator">-</span>
              {money(p.price * quantity)}
            </button>
          </div>
          <div className="product-specifications">
            {(p.width || p.height) && (
              <div className="dimensions">
                <h3>Size</h3>
                {p.width && (
                  <p>
                    <MoveHorizontal size={17} />
                    <span>Width —</span>
                    <strong>{p.width}</strong>
                  </p>
                )}
                {p.height && (
                  <p>
                    <MoveVertical size={17} />
                    <span>Height —</span>
                    <strong>{p.height}</strong>
                  </p>
                )}
              </div>
            )}
            <Link href={`/en/stores/${p.storeId}`} className="store-card">
              {p.storeImage ? (
                <img src={p.storeImage} alt="" />
              ) : (
                <span className="store-avatar">
                  <Store size={25} />
                </span>
              )}
              <div>
                <span>Store</span>
                <strong>{p.storeName}</strong>
              </div>
              <ChevronRight className="store-chevron" size={18} />
            </Link>
            {section && (
              <div className="product-categories">
                <h3>Kateqoriyalar</h3>
                <div>
                  <Link
                    className="pill"
                    href={`/en/categories/${section.categories[0]?.id}`}
                  >
                    {section.name === "Flowers"
                      ? "Ən çox satılanlar"
                      : section.productHeading}
                  </Link>
                  <Link
                    className="pill"
                    href={`/en/categories/${section.categories[0]?.id}`}
                  >
                    {section.name === "Flowers" ? "Güllər" : section.name}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="reviews-section" id="reviews">
        <h2>Product ratings and reviews</h2>
        <div className="empty-reviews">
          <StarOff size={18} />
          No reviews for this product yet
        </div>
      </section>
      <section className="related-section">
        <h2>Similar products</h2>
        <ProductGrid items={similar.slice(0, 8)} />
        <div className="section-divider">
          <Link
            className="outline-button"
            href={`/en/categories/${section?.categories[0]?.id || sections[0].categories[0].id}`}
          >
            View all similar products
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
      <section className="related-section">
        <h2>Other products from this store</h2>
        <ProductGrid items={storeProducts} />
        <div className="section-divider">
          <Link className="outline-button" href={`/en/stores/${p.storeId}`}>
            Show more
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
      {zoom && (
        <ModalShell
          title={p.name}
          onClose={() => setZoom(false)}
          className="image-modal"
        >
          <img src={p.images[image]} alt={p.name} />
        </ModalShell>
      )}
    </main>
  );
}
function ListingPage({ location }: { location: string }) {
  const [sort, setSort] = useState("recommended");
  const { modal } = useStore();
  const path = location.split("?")[0];
  const id = path.split("/").at(-1);
  const query = new URLSearchParams(location.split("?")[1]).get("q") || "";
  const section = sections.find((s) => s.categories.some((c) => c.id === id));
  const category = section?.categories.find((c) => c.id === id);
  const storeProduct = products.find((p) => p.storeId === id);
  let title = "Discover something special",
    items = products;
  if (path.includes("/search")) {
    title = query ? `Search results for “${query}”` : "All products";
    items = products.filter((p) =>
      `${p.name} ${p.storeName}`.toLowerCase().includes(query.toLowerCase()),
    );
  } else if (path.includes("/categories")) {
    title = category?.name || "All products";
    items = section
      ? products.filter((p) => section.productIds.includes(p.id))
      : products;
    const matching = items.filter((p) =>
      p.name.toLowerCase().includes(title.toLowerCase().split(" ")[0]),
    );
    if (matching.length > 0) items = matching;
  } else if (path.includes("/stores/")) {
    title = storeProduct?.storeName || "Store";
    items = products.filter((p) => p.storeId === id);
  }
  if (sort === "low") items = [...items].sort((a, b) => a.price - b.price);
  if (sort === "high") items = [...items].sort((a, b) => b.price - a.price);
  return (
    <main className="container listing-page">
      <Link className="back-link">
        <ArrowLeft size={18} />
        Home
      </Link>
      <h1>{title}</h1>
      {section && (
        <div className="listing-categories">
          <CategoryCarousel categories={section.categories} />
        </div>
      )}
      <div className="listing-toolbar">
        <span>{items.length} products</span>
        <label>
          <ArrowUpDown size={17} />
          <select
            aria-label="Sort products"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recommended">Recommended</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </label>
      </div>
      {items.length ? (
        <ProductGrid items={items} />
      ) : (
        <div className="empty-state">
          <Search size={40} />
          <h2>No products found</h2>
          <p>Try a different name or explore our categories.</p>
          <button
            className="primary-button"
            onClick={() => modal("categories")}
          >
            Browse categories
          </button>
        </div>
      )}
    </main>
  );
}
function StoresPage() {
  const stores = [...new Map(products.map((p) => [p.storeId, p])).values()];
  return (
    <main className="container listing-page">
      <h1>Stores</h1>
      <p className="page-description">
        Discover beautiful gifts from our stores.
      </p>
      <div className="stores-grid">
        {stores.map((p) => (
          <Link
            href={`/en/stores/${p.storeId}`}
            key={p.storeId}
            className="store-tile"
          >
            <img src={p.images[0]} alt="" />
            <div>
              {p.storeImage ? <img src={p.storeImage} alt="" /> : <Store />}
              <h2>{p.storeName}</h2>
              <ArrowRight size={20} />
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
function CartPage() {
  const { cart, updateCart, modal, customBouquets, updateCustom } = useStore();
  const items = Object.entries(cart)
    .map(([id, n]) => ({ p: productById(id), n }))
    .filter((x): x is { p: Product; n: number } => !!x.p);
  const subtotal =
    items.reduce((s, { p, n }) => s + p.price * n, 0) +
    customBouquets.reduce((sum, b) => sum + b.unitPrice * b.quantity, 0);
  const delivery = customBouquets.reduce((sum, b) => sum + b.deliveryFee, 0);
  const total = subtotal + delivery;
  return (
    <main className="container cart-page">
      <h1>My cart</h1>
      {!items.length && !customBouquets.length ? (
        <div className="empty-state">
          <ShoppingCart size={48} />
          <h2>Your cart is empty</h2>
          <p>Find a little something to make their day.</p>
          <Link className="primary-button">
            Explore products
            <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {items.map(({ p, n }) => (
              <article className="cart-item" key={p.id}>
                <Link href={productPath(p)}>
                  <img src={p.image} alt={p.name} />
                </Link>
                <div className="cart-item-info">
                  <Link href={productPath(p)}>
                    <h2>{p.name}</h2>
                  </Link>
                  <p>{p.storeName}</p>
                  <strong>{money(p.price * n)}</strong>
                  <Quantity
                    quantity={n}
                    setQuantity={(v) => updateCart(p.id, v)}
                    max={p.stock}
                  />
                </div>
                <button
                  className="icon-button"
                  aria-label={`Remove ${p.name}`}
                  onClick={() => updateCart(p.id, 0)}
                >
                  <Trash2 size={19} />
                </button>
              </article>
            ))}
            {customBouquets.map((b) => (
              <article className="cart-item custom-cart-item" key={b.id}>
                <div
                  className="custom-cart-art"
                  aria-label="Custom bouquet preview"
                >
                  {b.generatedImage ? (
                    <img
                      src={b.generatedImage}
                      alt="Generated bouquet preview"
                    />
                  ) : (
                    b.items
                      .filter((i) => i.image)
                      .slice(0, 5)
                      .map((item, i) => (
                        <img
                          src={item.image}
                          alt=""
                          key={`${item.name}-${i}`}
                          style={{
                            transform: `translate(${((i % 3) - 1) * 18}px,${Math.floor(i / 3) * 20 - 10}px) rotate(${(i - 2) * 18}deg)`,
                          }}
                        />
                      ))
                  )}
                </div>
                <div className="cart-item-info">
                  <h2>{b.name}</h2>
                  <p>
                    {b.storeName} ·{" "}
                    {b.delivery === "pickup" ? "Pickup" : "Delivery"}
                  </p>
                  <ul className="custom-cart-composition">
                    {b.items.map((item) => (
                      <li key={item.name}>
                        {item.name} ×{item.quantity}
                      </li>
                    ))}
                  </ul>
                  {b.note && <p>{b.note}</p>}
                  <strong>{money(b.unitPrice * b.quantity)}</strong>
                  <Quantity
                    quantity={b.quantity}
                    setQuantity={(n) => updateCustom(b.id, n)}
                    max={20}
                  />
                </div>
                <button
                  className="icon-button"
                  aria-label={`Remove ${b.name}`}
                  onClick={() => updateCustom(b.id, 0)}
                >
                  <Trash2 size={19} />
                </button>
              </article>
            ))}
          </div>
          <aside className="order-summary">
            <h2>Order summary</h2>
            <div>
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div>
              <span>Delivery</span>
              <span>
                {customBouquets.length
                  ? delivery > 0
                    ? money(delivery)
                    : "Free pickup"
                  : "Calculated at checkout"}
              </span>
            </div>
            <div className="order-total">
              <strong>Total</strong>
              <strong>{money(total)}</strong>
            </div>
            <button
              className="primary-button"
              onClick={() => modal("checkout")}
            >
              Continue to checkout
              <ArrowRight size={18} />
            </button>
            <Link className="continue-shopping">Continue shopping</Link>
          </aside>
        </div>
      )}
    </main>
  );
}
function Footer() {
  const { modal } = useStore();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-about">
            <Link>
              <img src={branding.logo} alt="Floume" />
            </Link>
            <p>
              Personalized bouquets crafted with care — powered by you or guided
              by AI. Every bloom tells your story.
            </p>
            <div className="social-links">
              {["Instagram", "X", "Youtube"].map((s) => (
                <a
                  key={s}
                  aria-label={s}
                  href={`https://${s === "Instagram" ? "instagram.com" : s === "Youtube" ? "youtube.com" : "x.com"}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s === "Instagram" ? (
                    <Instagram size={24} />
                  ) : s === "Youtube" ? (
                    <Youtube size={24} />
                  ) : (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M4 4l11.733 16h4.267L8.267 4H4zM4 20l6.768-6.768m2.46-2.46L20 4" />
                    </svg>
                  )}
                </a>
              ))}
            </div>
          </div>
          <div className="footer-links">
            <div>
              <h3>Useful links</h3>
              <Link href="/en/about">About Floume</Link>
              <Link href="/en/blog">Blog</Link>
              <Link href="/en/about#partners">Media and partners</Link>
            </div>
            <div>
              <h3>Help and support</h3>
              <button onClick={() => modal("help")}>Help center</button>
              <Link href="/en/about#faq">Frequently asked questions</Link>
            </div>
            <div>
              <h3>Legal</h3>
              <Link href="/en/legals/privacy-policy">Privacy policy</Link>
              <Link href="/en/legals/terms-of-use">Terms of use</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            ©2026 <Link>Floume</Link>
          </span>
          <div className="payment-methods">
            <span>
              <ShieldCheck size={18} />
              Secure payment
            </span>
            {["applePay", "googlePay", "visa", "mastercard"].map((k) => (
              <img
                key={k}
                src={branding[k]}
                alt={
                  {
                    applePay: "Apple Pay",
                    googlePay: "Google Pay",
                    visa: "Visa",
                    mastercard: "Mastercard",
                  }[k]
                }
              />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
function InfoPage({ location }: { location: string }) {
  const title = location.includes("privacy")
    ? "Privacy policy"
    : location.includes("terms")
      ? "Terms of use"
      : location.includes("blog")
        ? "Blog"
        : "About Floume";
  return (
    <main className="container info-page">
      <Link className="back-link">
        <ArrowLeft size={18} />
        Home
      </Link>
      <h1>{title}</h1>
      <div className="info-content">
        <img src={branding.logoIcon} alt="" />
        <h2>Every bloom tells your story.</h2>
        <p>
          Personalized bouquets crafted with care — powered by you or guided by
          AI.
        </p>
        <p>
          This local storefront preview recreates the shopping design. Account
          services, editorial content, legal documents, and checkout are
          available on the original Floume website.
        </p>
        <a
          className="outline-button"
          href={`https://floume.ai${location}`}
          target="_blank"
          rel="noreferrer"
        >
          Visit Floume
          <ArrowRight size={18} />
        </a>
      </div>
    </main>
  );
}
function ModalShell({
  title,
  onClose,
  children,
  className = "",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const elements = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input,select,[tabindex="0"]',
        );
        if (!elements?.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal-panel ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <button
          className="modal-close icon-button"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={22} />
        </button>
        {children}
      </div>
    </div>
  );
}
function SignIn({ close }: { close: () => void }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  return (
    <ModalShell title="Sign in" onClose={close} className="signin-modal">
      <h2>Sign in</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError("Sign-in is unavailable in this local preview.");
        }}
      >
        <label htmlFor="phone">Enter your phone number</label>
        <div className="phone-input">
          <span>
            🇦🇿 +994
            <ChevronDown size={14} />
          </span>
          <input
            id="phone"
            type="tel"
            autoComplete="tel-national"
            placeholder="Enter your phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            minLength={7}
          />
        </div>
        {error && (
          <p role="status" className="form-message">
            {error}
          </p>
        )}
        <button type="submit" className="primary-button">
          Continue
        </button>
        <button
          type="button"
          className="telegram-button outline-button"
          onClick={() =>
            setError("Telegram sign-in is unavailable in this local preview.")
          }
        >
          <Send size={20} />
          Sign in with Telegram
        </button>
      </form>
      <p className="signin-terms">
        By signing in, I agree to the{" "}
        <Link href="/en/legals/terms-of-use" onClick={close}>
          terms of use
        </Link>
        .
      </p>
    </ModalShell>
  );
}
function CategoriesMenu({ close }: { close: () => void }) {
  return (
    <ModalShell title="Categories" onClose={close} className="categories-modal">
      <h2>Categories</h2>
      <div className="category-menu-grid">
        {sections.map((s) => (
          <div key={s.name}>
            <h3>{s.name}</h3>
            {s.categories.map((c) => (
              <Link key={c.id} href={`/en/categories/${c.id}`} onClick={close}>
                <img src={c.image} alt="" />
                <span>{c.name}</span>
                <ChevronRight size={17} />
              </Link>
            ))}
          </div>
        ))}
      </div>
    </ModalShell>
  );
}
export default function App() {
  const [location, setLocation] = useState(
    window.location.pathname + window.location.search,
  );
  const [modal, setModal] = useState<Modal>(null);
  const [customSeed, setCustomSeed] = useState<
    Record<string, number> | undefined
  >();
  const [customBouquets, setCustomBouquets] = useLocal<CustomBouquet[]>(
    "floume-custom-bouquets",
    [],
  );
  const [favorites, setFavorites] = useLocal<string[]>("floume-favorites", []);
  const [cart, setCart] = useLocal<Cart>("floume-cart", {});
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  function navigate(url: string) {
    if (url !== window.location.pathname + window.location.search)
      window.history.pushState({}, "", url);
    setLocation(url);
    setModal(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function notify(text: string) {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  }
  function add(p: Product, n: number) {
    setCart((old) => ({
      ...old,
      [p.id]: Math.min(p.stock, (old[p.id] || 0) + n),
    }));
    notify("Added to your cart");
  }
  useEffect(() => {
    const pop = () => {
      setLocation(window.location.pathname + window.location.search);
      setModal(null);
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  const path = location.split("?")[0];
  const isProduct = path.includes("/products/");
  const product = isProduct ? productById(path.split("/")[3]) : undefined;
  useEffect(() => {
    document.title = product ? `${product.name} | Floume` : "Floume AI";
  }, [product, location]);
  let page: ReactNode;
  if (product) page = <ProductPage product={product} />;
  else if (isProduct)
    page = (
      <main className="container empty-state">
        <h1>Product not found</h1>
        <Link className="primary-button">Back to the store</Link>
      </main>
    );
  else if (path === "/en/" || path === "/" || path === "/en")
    page = <HomePage />;
  else if (path === "/en/cart") page = <CartPage />;
  else if (path === "/en/stores") page = <StoresPage />;
  else if (
    ["/search", "/categories/", "/stores/", "/banners/"].some((p) =>
      path.includes(p),
    )
  )
    page = <ListingPage location={location} />;
  else page = <InfoPage location={location} />;
  return (
    <AppContext.Provider
      value={{
        navigate,
        modal: (type) => {
          if (type === "customize") setCustomSeed(undefined);
          setModal(type);
        },
        customBouquets,
        updateCustom: (id, n) =>
          setCustomBouquets((old) =>
            n > 0
              ? old.map((b) => (b.id === id ? { ...b, quantity: n } : b))
              : old.filter((b) => b.id !== id),
          ),
        favorites,
        favorite: (id) =>
          setFavorites((old) =>
            old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
          ),
        cart,
        add,
        updateCart: (id, n) =>
          setCart((old) => {
            const next = { ...old };
            if (n > 0) next[id] = n;
            else delete next[id];
            return next;
          }),
        notify,
      }}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div id="storefront-shell">
        <Header productPage={isProduct} location={location} />
        <div id="main-content">{page}</div>
        <Footer />
        <FloatingNavigation />
      </div>
      {modal === "ai" && (
        <BouquetAssistant
          onClose={() => setModal(null)}
          products={products}
          onAdd={(id) => {
            const p = productById(id);
            if (p) add(p, 1);
          }}
          onView={(id) => navigate(`/en/products/${id}`)}
          onCustomize={(flowers) => {
            setCustomSeed(flowers);
            setModal("customize");
          }}
        />
      )}
      {modal === "customize" && (
        <BouquetCustomizer
          onClose={() => setModal(null)}
          initialFlowers={customSeed}
          onSave={(design) => {
            setCustomBouquets((old) => [...old, design]);
            notify("Bouquet saved to your cart");
          }}
        />
      )}
      {modal === "signin" && <SignIn close={() => setModal(null)} />}{" "}
      {modal === "categories" && (
        <CategoriesMenu close={() => setModal(null)} />
      )}{" "}
      {(modal === "checkout" || modal === "help") && (
        <ModalShell
          title={modal === "help" ? "Help center" : "Checkout"}
          onClose={() => setModal(null)}
          className="notice-modal"
        >
          {modal === "help" ? (
            <MessageCircle size={36} />
          ) : (
            <ShoppingCart size={36} />
          )}
          <h2>
            {modal === "help" ? "How can we help?" : "Your cart is ready"}
          </h2>
          <p>
            {modal === "help"
              ? "For questions about products, delivery, or orders, visit Floume’s help center."
              : "Checkout is unavailable in this local storefront preview. Your cart will stay saved on this device."}
          </p>
          <button className="primary-button" onClick={() => setModal(null)}>
            Continue browsing
          </button>
        </ModalShell>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <Link href="/en/cart">
            View cart
            <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </AppContext.Provider>
  );
}
