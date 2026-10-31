import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  Gift,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Store,
  X,
} from "lucide-react";
import { ArrowRight } from "./icons";
import { FlowDialog } from "./FlowDialog";
import data from "../bouquet-data.json";
import "../bouquet-customizer.css";

export type CustomBouquet = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  storeName: string;
  items: { name: string; image: string; quantity: number; price: number }[];
  delivery: "address" | "pickup";
  deliveryFee: number;
  note: string;
  date: string;
  address?: string;
  generatedImage?: string;
};
type Point = { x: number; y: number };
type Draft = {
  step: number;
  flowers: Record<string, number>;
  positions: Record<string, Point>;
  store: boolean;
  base: string;
  decors: Record<string, number>;
  quantity: number;
  delivery: "address" | "pickup";
  address: string;
  date: string;
  note: string;
  showNote: boolean;
  showPromo: boolean;
  promo: string;
  discount: boolean;
};
const initial: Draft = {
  step: 0,
  flowers: {},
  positions: {},
  store: false,
  base: "",
  decors: {},
  quantity: 1,
  delivery: "address",
  address: "",
  date: "",
  note: "",
  showNote: false,
  showPromo: false,
  promo: "",
  discount: false,
};
const key = "floume-bouquet-draft";
const titles = [
  "Design your own bouquet",
  "Choose a store",
  "Choose a base",
  "Decor & ribbons",
  "Complete your order",
];
const money = (n: number) => `₼${n.toFixed(2)}`;
function readDraft(): Draft {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      return {
        ...initial,
        ...saved,
        step: Math.max(0, Math.min(4, Number(saved.step) || 0)),
        flowers: saved.flowers || {},
        decors: saved.decors || {},
        positions: saved.positions || {},
      };
    }
  } catch {
    /* A damaged preview draft starts fresh. */
  }
  return initial;
}
function Counter({
  value,
  onChange,
  label,
  min = 0,
  max = 99,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="bc-counter" aria-label={`${label} quantity`}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus size={18} />
      </button>
      <output aria-label={`${label} quantity`}>{value}</output>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
function positionFor(index: number): Point {
  return (
    data.canvasPoints[index % data.canvasPoints.length] || { x: 50, y: 50 }
  );
}

export default function BouquetCustomizer({
  onClose,
  onSave,
  initialFlowers,
}: {
  onClose: () => void;
  onSave: (design: CustomBouquet) => void;
  initialFlowers?: Record<string, number>;
}) {
  const [draft, setDraft] = useState<Draft>(() => {
    if (initialFlowers) {
      const flowers = Object.fromEntries(
        data.flowers
          .filter((f) => Number(initialFlowers[f.id]) > 0)
          .map((f) => [
            f.id,
            Math.min(50, Math.floor(Number(initialFlowers[f.id]))),
          ]),
      );
      return { ...initial, flowers };
    }
    return readDraft();
  });
  const [category, setCategory] = useState("All");
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState("");
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [promoMessage, setPromoMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [generated, setGenerated] = useState<{
    key: string;
    url: string;
  } | null>(null);
  const [imageVariant, setImageVariant] = useState(0);
  const [previewMode, setPreviewMode] = useState<"arrangement" | "generated">(
    "arrangement",
  );
  const [generating, setGenerating] = useState(false);
  const [imageError, setImageError] = useState("");
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; target: HTMLElement } | null>(null);
  const bodyTop = useRef<HTMLDivElement>(null);
  const patch = (update: Partial<Draft>) =>
    setDraft((previous) => ({ ...previous, ...update }));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(draft));
    } catch {
      /* The draft still works when storage is unavailable. */
    }
  }, [draft]);
  useEffect(() => {
    bodyTop.current?.scrollIntoView({ block: "start" });
  }, [draft.step]);
  const selected = data.flowers.filter((f) => (draft.flowers[f.id] || 0) > 0);
  const imageKey = JSON.stringify({
    flowers: draft.flowers,
    base: draft.base,
    decors: draft.decors,
  });
  const generatedImage =
    generated?.key === imageKey ? generated.url : undefined;
  async function generatePreview() {
    if (!selected.length || generating) return;
    const variant = generatedImage ? imageVariant + 1 : imageVariant;
    if (variant > 100) return;
    if (variant !== imageVariant) setImageVariant(variant);
    setGenerating(true);
    setImageError("");
    try {
      const response = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowers: selected.map((f) => ({
            id: f.id,
            quantity: draft.flowers[f.id],
          })),
          base: draft.base,
          decors: Object.keys(draft.decors).filter(
            (id) => draft.decors[id] > 0,
          ),
          variant,
        }),
      });
      const result = await response.json();
      if (!response.ok || typeof result.imageUrl !== "string")
        throw new Error(
          result.error || "Could not generate the bouquet image.",
        );
      setGenerated({ key: imageKey, url: result.imageUrl });
      setPreviewMode("generated");
    } catch (error) {
      setImageError(
        error instanceof Error
          ? error.message
          : "Could not generate the bouquet image.",
      );
    } finally {
      setGenerating(false);
    }
  }
  const flowerCount = selected.reduce((sum, f) => sum + draft.flowers[f.id], 0);
  const base = data.bases.find((b) => b.id === draft.base);
  const extras = data.decors.filter((d) => (draft.decors[d.id] || 0) > 0);
  const items = [
    ...selected.map((f) => ({
      name: f.name,
      image: f.image,
      quantity: draft.flowers[f.id],
      price: f.price,
    })),
    ...(base
      ? [{ name: base.name, image: base.image, quantity: 1, price: base.price }]
      : []),
    ...extras.map((d) => ({
      name: d.name,
      image: d.image,
      quantity: draft.decors[d.id],
      price: d.price,
    })),
  ];
  const rawPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = draft.discount ? Math.round(rawPrice * 0.1 * 100) / 100 : 0;
  const unitPrice = Math.round((rawPrice - discount) * 100) / 100;
  const deliveryFee = draft.delivery === "pickup" ? 0 : 7;
  const total = unitPrice * draft.quantity + deliveryFee;
  const visibleFlowers = data.flowers.filter(
    (f) =>
      (category === "All" || f.category === category) &&
      f.name.toLowerCase().includes(search.toLowerCase()),
  );
  const instances = useMemo(
    () =>
      selected.flatMap((f) =>
        Array.from({ length: draft.flowers[f.id] }, (_, i) => ({
          id: `${f.id}:${i}`,
          flower: f,
        })),
      ),
    [draft.flowers],
  );
  const updateFlower = (id: string, count: number) =>
    setDraft((previous) => {
      const flowers = { ...previous.flowers };
      if (count > 0) flowers[id] = Math.min(50, count);
      else delete flowers[id];
      return { ...previous, flowers, store: false };
    });
  const updateDecor = (id: string, count: number) =>
    setDraft((previous) => ({
      ...previous,
      decors: { ...previous.decors, [id]: count },
    }));
  function changeStep(step: number) {
    patch({ step });
  }
  function pointFromEvent(event: PointerEvent<HTMLElement>): Point | null {
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect) return null;
    let x = ((event.clientX - rect.left) / rect.width) * 100,
      y = ((event.clientY - rect.top) / rect.height) * 100;
    const distance = Math.hypot(x - 50, y - 50);
    if (distance > 40) {
      x = 50 + ((x - 50) * 40) / distance;
      y = 50 + ((y - 50) * 40) / distance;
    }
    return { x, y };
  }
  function moveStart(event: PointerEvent<HTMLButtonElement>, id: string) {
    event.preventDefault();
    drag.current = { id, target: event.currentTarget };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveFlower(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    const point = pointFromEvent(event);
    if (point)
      setDraft((previous) => ({
        ...previous,
        positions: { ...previous.positions, [drag.current!.id]: point },
      }));
  }
  function moveKey(
    event: KeyboardEvent<HTMLButtonElement>,
    id: string,
    index: number,
  ) {
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    const p = draft.positions[id] || positionFor(index);
    patch({
      positions: {
        ...draft.positions,
        [id]: {
          x: Math.max(
            10,
            Math.min(
              90,
              p.x +
                (event.key === "ArrowRight"
                  ? 3
                  : event.key === "ArrowLeft"
                    ? -3
                    : 0),
            ),
          ),
          y: Math.max(
            10,
            Math.min(
              90,
              p.y +
                (event.key === "ArrowDown"
                  ? 3
                  : event.key === "ArrowUp"
                    ? -3
                    : 0),
            ),
          ),
        },
      },
    });
  }
  function bouquetCanvas(small = false) {
    return (
      <div
        className={`bc-canvas ${small ? "bc-canvas-small" : ""}`}
        ref={small ? undefined : canvas}
        aria-label="Bouquet arrangement"
      >
        {!small &&
          data.canvasPoints.map((point, index) => (
            <span
              key={`point-${index}`}
              className="bc-canvas-dot"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            />
          ))}
        {instances.map((item, index) => {
          const pos = draft.positions[item.id] || positionFor(index);
          return small ? (
            <img
              key={item.id}
              className="bc-placed-image"
              src={item.flower.image}
              alt=""
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            />
          ) : (
            <button
              key={item.id}
              type="button"
              className="bc-placed-flower"
              aria-label={`Move ${item.flower.name} ${index + 1}`}
              title="Drag to arrange, or use arrow keys"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` } as CSSProperties}
              onPointerDown={(e) => moveStart(e, item.id)}
              onPointerMove={moveFlower}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
              onKeyDown={(e) => moveKey(e, item.id, index)}
            >
              <img
                src={item.flower.image}
                alt={item.flower.name}
                draggable={false}
              />
            </button>
          );
        })}
        {!instances.length && (
          <p>The bouquet is empty — pick flowers above to add them</p>
        )}
      </div>
    );
  }
  function saveBouquet() {
    if (
      !flowerCount ||
      !draft.store ||
      (draft.delivery === "address" && !draft.address.trim())
    )
      return;
    onSave({
      id: crypto.randomUUID(),
      name: "Design your own bouquet",
      quantity: draft.quantity,
      unitPrice,
      storeName: data.store.name,
      items,
      delivery: draft.delivery,
      deliveryFee,
      note: draft.showNote ? draft.note : "",
      date: draft.date,
      address: draft.delivery === "address" ? draft.address : undefined,
      generatedImage,
    });
    setSaved(true);
    localStorage.removeItem(key);
  }
  const canContinue =
    draft.step === 0 ? flowerCount > 0 : draft.step === 1 ? draft.store : true;
  const footer = saved ? (
    <button className="primary-button bc-next" onClick={onClose}>
      Continue browsing
      <ArrowRight size={20} />
    </button>
  ) : (
    <div className="bc-footer-buttons">
      {draft.step > 0 && (
        <button
          className="outline-button bc-back"
          onClick={() => changeStep(draft.step - 1)}
        >
          <ArrowLeft size={18} />
          Back
        </button>
      )}
      {draft.step < 4 ? (
        <button
          className="primary-button bc-next"
          disabled={!canContinue}
          onClick={() => changeStep(draft.step + 1)}
        >
          {draft.step === 2 && !draft.base ? "Skip" : "Continue"}
          <ArrowRight size={20} />
        </button>
      ) : (
        <button
          className="primary-button bc-next"
          disabled={
            !flowerCount ||
            !draft.store ||
            (draft.delivery === "address" && !draft.address.trim())
          }
          onClick={saveBouquet}
        >
          <ShoppingBag size={18} />
          Save bouquet
        </button>
      )}
    </div>
  );
  return (
    <FlowDialog
      title={saved ? "Bouquet saved" : titles[draft.step]}
      onClose={onClose}
      footer={footer}
      className="bouquet-customizer"
    >
      <div ref={bodyTop} />
      {saved ? (
        <div className="bc-saved">
          <CheckCircle2 size={56} />
          <h2>Your bouquet is saved</h2>
          <p>Your design is in your cart, ready whenever you are.</p>
          {generatedImage ? (
            <img
              className="bc-generated-image"
              src={generatedImage}
              alt="Generated bouquet preview"
            />
          ) : (
            bouquetCanvas()
          )}
          <p className="bc-preview-note">
            Saved on this device. No order or payment was submitted.
          </p>
        </div>
      ) : (
        <>
          {draft.step === 0 && (
            <div className="bc-flower-step">
              <div className="bc-filter-bar">
                <div
                  className="bc-category-track"
                  aria-label="Flower categories"
                >
                  {data.categories.map((c) => (
                    <button
                      key={c}
                      className={`bc-chip ${category === c ? "selected" : ""}`}
                      aria-pressed={category === c}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <button
                  className="bc-search-toggle"
                  aria-label={
                    searching ? "Close flower search" : "Search flowers..."
                  }
                  onClick={() => {
                    setSearching(!searching);
                    if (searching) setSearch("");
                  }}
                >
                  {searching ? <X size={20} /> : <Search size={20} />}
                </button>
              </div>
              {searching && (
                <div className="bc-flower-search">
                  <Search size={18} />
                  <input
                    aria-label="Search flowers"
                    placeholder="Search flowers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                  />
                  {search && (
                    <button
                      aria-label="Clear flower search"
                      onClick={() => setSearch("")}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )}
              <div className="bc-flower-track" aria-label="Available flowers">
                {visibleFlowers.map((f) => (
                  <button
                    key={f.id}
                    className={`bc-flower-chip ${draft.flowers[f.id] ? "selected" : ""}`}
                    aria-label={`${f.name}${draft.flowers[f.id] ? ` ${draft.flowers[f.id]}` : ""}`}
                    onClick={() =>
                      updateFlower(f.id, (draft.flowers[f.id] || 0) + 1)
                    }
                  >
                    <img src={f.image} alt="" />
                    <span>{f.name}</span>
                    {draft.flowers[f.id] > 0 && <b>{draft.flowers[f.id]}</b>}
                  </button>
                ))}
                {!visibleFlowers.length && (
                  <p className="bc-no-results">
                    No flowers found. Try a different name.
                  </p>
                )}
              </div>
              <div className="bc-canvas-wrap">
                {generatedImage && (
                  <div
                    className="bc-preview-tabs"
                    role="group"
                    aria-label="Bouquet preview mode"
                  >
                    <button
                      type="button"
                      aria-pressed={previewMode === "arrangement"}
                      onClick={() => setPreviewMode("arrangement")}
                    >
                      Arrange flowers
                    </button>
                    <button
                      type="button"
                      aria-pressed={previewMode === "generated"}
                      onClick={() => setPreviewMode("generated")}
                    >
                      AI preview
                    </button>
                  </div>
                )}
                {generatedImage && previewMode === "generated" ? (
                  <img
                    className="bc-generated-image bc-generated-main"
                    src={generatedImage}
                    alt="AI-generated preview of your bouquet"
                  />
                ) : (
                  bouquetCanvas()
                )}
                {flowerCount > 0 && (
                  <div className="bc-image-preview">
                    <button
                      type="button"
                      className="outline-button"
                      disabled={generating}
                      onClick={() => void generatePreview()}
                    >
                      {generating
                        ? "Generating on this Mac…"
                        : generatedImage
                          ? "Generate again"
                          : "Generate realistic bouquet preview"}
                    </button>
                    <p>
                      AI visualization of your selected flowers. The florist’s
                      final arrangement may differ.
                    </p>
                    {imageError && (
                      <p role="alert" className="bc-image-error">
                        {imageError}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="bc-selected">
                <div className="bc-selected-heading">
                  {selected.length > 0 && <h3>Selected flowers</h3>}
                  {selected.length > 0 && (
                    <button
                      onClick={() => {
                        patch({ flowers: {}, positions: {}, store: false });
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>
                {selected.map((f) => (
                  <div className="bc-selected-row" key={f.id}>
                    <img src={f.image} alt="" />
                    <p>{f.name}</p>
                    <Counter
                      value={draft.flowers[f.id]}
                      onChange={(n) => updateFlower(f.id, n)}
                      label={f.name}
                      max={50}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {draft.step === 1 && (
            <div className="bc-padded bc-store-step">
              <p className="bc-description">
                Choose the store that will prepare your bouquet — prices vary by
                store.
              </p>
              <button
                className={`bc-store-option ${draft.store ? "selected" : ""}`}
                aria-pressed={draft.store}
                onClick={() => patch({ store: true })}
              >
                <img src={data.store.image} alt={data.store.name} />
                <span>
                  <strong>{data.store.name}</strong>
                  <small>
                    {money(
                      selected.reduce(
                        (s, f) => s + f.price * draft.flowers[f.id],
                        0,
                      ),
                    )}
                  </small>
                </span>
                {draft.store && <Check size={20} />}
              </button>
            </div>
          )}
          {draft.step === 2 && (
            <div className="bc-padded">
              <p className="bc-description">
                Optional: pick a box or base for your bouquet.
              </p>
              <div className="bc-base-grid">
                {data.bases.map((b) => (
                  <button
                    key={b.id}
                    className={`bc-base-option ${draft.base === b.id ? "selected" : ""}`}
                    aria-pressed={draft.base === b.id}
                    onClick={() =>
                      patch({ base: draft.base === b.id ? "" : b.id })
                    }
                  >
                    <div>
                      <img src={b.image} alt={b.name} />
                      {draft.base === b.id && (
                        <span className="bc-selection-check">
                          <Check size={16} />
                        </span>
                      )}
                    </div>
                    <p>{b.name}</p>
                    <p className="bc-option-price">{money(b.price)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {draft.step === 3 && (
            <div className="bc-padded">
              <p className="bc-description">
                Optional: add decor and ribbons to your bouquet.
              </p>
              {(["decor", "ribbon"] as const).map((type) => (
                <section className="bc-decor-section" key={type}>
                  <h3>{type === "decor" ? "Decors" : "Ribbons"}</h3>
                  {data.decors
                    .filter((d) => d.type === type)
                    .map((d) => (
                      <div className="bc-decor-row" key={d.id}>
                        <img src={d.image} alt={d.name} />
                        <span>
                          {d.name}
                          <small>{money(d.price)}</small>
                        </span>
                        <Counter
                          label={d.name}
                          value={draft.decors[d.id] || 0}
                          onChange={(n) => updateDecor(d.id, n)}
                        />
                      </div>
                    ))}
                </section>
              ))}
            </div>
          )}
          {draft.step === 4 && (
            <div className="bc-padded bc-review">
              <div className="bc-review-product">
                <div className="bc-summary-image">
                  {generatedImage ? (
                    <img
                      className="bc-generated-image"
                      src={generatedImage}
                      alt="AI-generated bouquet preview"
                    />
                  ) : (
                    bouquetCanvas(true)
                  )}
                </div>
                <div>
                  <p>Design your own bouquet</p>
                  <small>
                    Composition ({items.reduce((s, i) => s + i.quantity, 0)})
                  </small>
                  <strong>{money(unitPrice)}</strong>
                </div>
                <Counter
                  label="Bouquets"
                  value={draft.quantity}
                  onChange={(n) => patch({ quantity: n })}
                  min={1}
                />
              </div>
              <ul className="bc-composition-list">
                {items.map((item) => (
                  <li key={item.name}>
                    <span>
                      {item.name} ×{item.quantity}
                    </span>
                    <span>{money(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="bc-review-divider" />
              <fieldset className="bc-delivery">
                <legend>Delivery method</legend>
                <div
                  className={`bc-option-card ${draft.delivery === "address" ? "selected" : ""}`}
                >
                  <label className="bc-option-label">
                    <input
                      type="radio"
                      name="bouquet-delivery"
                      value="address"
                      checked={draft.delivery === "address"}
                      onChange={() => patch({ delivery: "address" })}
                    />
                    <span className="bc-radio-check">
                      {draft.delivery === "address" && <Check size={18} />}
                    </span>
                    <span>Deliver to address</span>
                  </label>
                  {draft.delivery === "address" && (
                    <div className="bc-option-content">
                      {draft.address ? (
                        <div className="bc-address-saved">
                          <MapPin size={18} />
                          <span>{draft.address}</span>
                          <button
                            onClick={() => {
                              setAddressInput(draft.address);
                              setAddingAddress(true);
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <p className="bc-empty-address">
                          <MapPin size={24} />
                          No addresses yet
                        </p>
                      )}
                      {addingAddress ? (
                        <form
                          className="bc-address-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (addressInput.trim()) {
                              patch({ address: addressInput.trim() });
                              setAddingAddress(false);
                            }
                          }}
                        >
                          <label htmlFor="bouquet-address">
                            Delivery address
                          </label>
                          <input
                            id="bouquet-address"
                            autoComplete="street-address"
                            value={addressInput}
                            onChange={(e) => setAddressInput(e.target.value)}
                            placeholder="Street, building, apartment"
                            required
                          />
                          <div>
                            <button
                              className="outline-button"
                              type="button"
                              onClick={() => setAddingAddress(false)}
                            >
                              Cancel
                            </button>
                            <button className="primary-button" type="submit">
                              Save address
                            </button>
                          </div>
                        </form>
                      ) : (
                        !draft.address && (
                          <button
                            className="outline-button bc-address-button"
                            onClick={() => setAddingAddress(true)}
                          >
                            <Plus size={18} />
                            Add new address
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
                <div
                  className={`bc-option-card ${draft.delivery === "pickup" ? "selected" : ""}`}
                >
                  <label className="bc-option-label">
                    <input
                      type="radio"
                      name="bouquet-delivery"
                      value="pickup"
                      checked={draft.delivery === "pickup"}
                      onChange={() => patch({ delivery: "pickup" })}
                    />
                    <span className="bc-radio-check">
                      {draft.delivery === "pickup" && <Check size={18} />}
                    </span>
                    <span>Pickup point</span>
                  </label>
                  {draft.delivery === "pickup" && (
                    <div className="bc-option-content">
                      <p className="bc-pickup-note">
                        <Store size={18} />
                        You'll pick up the order from the store yourself.
                      </p>
                    </div>
                  )}
                </div>
              </fieldset>
              <div className="bc-date">
                <label htmlFor="bouquet-date">
                  {draft.delivery === "pickup"
                    ? "Pickup date"
                    : "Delivery date"}
                </label>
                <div>
                  <CalendarDays size={18} />
                  <input
                    id="bouquet-date"
                    type="datetime-local"
                    value={draft.date}
                    onChange={(e) => patch({ date: e.target.value })}
                  />
                </div>
                <p>
                  Choose the date and time you'd like the bouquet{" "}
                  {draft.delivery === "pickup"
                    ? "collected from the store"
                    : "delivered"}
                </p>
              </div>
              <div
                className={`bc-option-card ${draft.showPromo ? "selected" : ""}`}
              >
                <label className="bc-option-label">
                  <input
                    type="checkbox"
                    checked={draft.showPromo}
                    onChange={(e) => {
                      patch({
                        showPromo: e.target.checked,
                        discount: e.target.checked ? draft.discount : false,
                      });
                    }}
                  />
                  <span className="bc-radio-check">
                    {draft.showPromo && <Check size={18} />}
                  </span>
                  <span>
                    Promo code
                    <small>Enter your discount code if you have one</small>
                  </span>
                </label>
                {draft.showPromo && (
                  <div className="bc-option-content">
                    <form
                      className="bc-promo-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const valid =
                          draft.promo.trim().toUpperCase() === "WELCOME10";
                        patch({ discount: valid });
                        setPromoMessage(
                          valid
                            ? "10% discount applied to this preview."
                            : "This code is not available in the preview.",
                        );
                      }}
                    >
                      <Gift size={18} />
                      <input
                        aria-label="Promo code"
                        placeholder="Enter promo code"
                        value={draft.promo}
                        onChange={(e) =>
                          patch({ promo: e.target.value, discount: false })
                        }
                      />
                      <button type="submit" disabled={!draft.promo.trim()}>
                        Apply
                      </button>
                    </form>
                    {promoMessage && (
                      <p className="bc-promo-message" role="status">
                        {promoMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div
                className={`bc-option-card ${draft.showNote ? "selected" : ""}`}
              >
                <label className="bc-option-label">
                  <input
                    type="checkbox"
                    checked={draft.showNote}
                    onChange={(e) => patch({ showNote: e.target.checked })}
                  />
                  <span className="bc-radio-check">
                    {draft.showNote && <Check size={18} />}
                  </span>
                  <span>
                    Order note
                    <small>Add a note for delivery or arrangement</small>
                  </span>
                </label>
                {draft.showNote && (
                  <div className="bc-option-content">
                    <textarea
                      aria-label="Order note"
                      placeholder="For example: leave at the door without calling, add a gift card..."
                      value={draft.note}
                      onChange={(e) => patch({ note: e.target.value })}
                      maxLength={1000}
                    />
                  </div>
                )}
              </div>
              <section className="bc-order-summary">
                <h3>
                  Order summary ({items.reduce((s, i) => s + i.quantity, 0)})
                </h3>
                <p>
                  <span>Subtotal</span>
                  <span>{money(rawPrice * draft.quantity)}</span>
                </p>
                {draft.discount && (
                  <p className="bc-discount">
                    <span>WELCOME10</span>
                    <span>−{money(discount * draft.quantity)}</span>
                  </p>
                )}
                <p>
                  <span>Delivery</span>
                  <span>{deliveryFee ? money(deliveryFee) : "Free"}</span>
                </p>
                <div className="bc-summary-total">
                  <strong>Total</strong>
                  <strong>{money(total)}</strong>
                </div>
              </section>
              <section className="bc-payment">
                <h3>Payment method</h3>
                <button className="bc-bank-card" type="button">
                  <CreditCard size={20} />
                  Bank card
                  <Check size={18} />
                </button>
              </section>
              <p className="bc-preview-note">
                Local preview · flower prices are sample estimates. Saving keeps
                your design in this device's cart; no payment or order is
                submitted.
              </p>
            </div>
          )}
        </>
      )}
    </FlowDialog>
  );
}
