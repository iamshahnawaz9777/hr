import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Search, Package, BarChart2, Download } from 'lucide-react';
import type { Item, ItemCategory } from '@/types/types';
import { exportCSV } from '@/utils/exportData';

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  glass_sheets: 'Glass Sheets', hardware: 'Hardware', tools: 'Tools',
  chemicals: 'Chemicals', frames: 'Frames', accessories: 'Accessories',
  packaging: 'Packaging', others: 'Others',
};

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showLowOnly, setShowLowOnly] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.from('items').select('*').order('category').order('item_code');
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const filtered = items.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.item_code.toLowerCase().includes(search.toLowerCase());
    const matchLow = !showLowOnly || item.current_stock <= item.min_stock;
    return matchSearch && matchLow;
  });

  const lowCount = items.filter(i => i.current_stock <= i.min_stock).length;
  const totalValue = items.length;

  // Group by category
  const grouped = filtered.reduce((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, Item[]>);

  const getStockPct = (item: Item) => {
    if (!item.min_stock) return 100;
    const pct = (item.current_stock / (item.min_stock * 2)) * 100;
    return Math.min(pct, 100);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold flex items-center gap-2"><BarChart2 className="w-5 h-5 text-primary" /> Inventory Dashboard</h1>
        <Button
          size="sm"
          variant="outline"
          onClick={() => exportCSV(
            items.map(i => ({ item_code: i.item_code, name: i.name, category: i.category, unit: i.unit, current_stock: i.current_stock, min_stock: i.min_stock, location: i.location || '' })),
            'inventory_export'
          )}
          disabled={items.length === 0}
        >
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            <div><p className="text-2xl font-bold">{totalValue}</p><p className="text-xs text-muted-foreground">Total Items</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <div><p className="text-2xl font-bold text-destructive">{lowCount}</p><p className="text-xs text-muted-foreground">Low Stock Items</p></div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <BarChart2 className="w-8 h-8 text-info" />
            <div><p className="text-2xl font-bold">{Object.keys(grouped).length}</p><p className="text-xs text-muted-foreground">Categories</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48 h-9" />
        </div>
        <Button size="sm" variant={showLowOnly ? 'default' : 'secondary'} onClick={() => setShowLowOnly(!showLowOnly)} className="h-9 gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> Low Stock Only {showLowOnly && `(${lowCount})`}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 bg-muted" />)}</div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No items found.</CardContent></Card>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {CATEGORY_LABELS[cat as ItemCategory] || cat} ({catItems.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
              {catItems.map(item => {
                const isLow = item.current_stock <= item.min_stock;
                const pct = getStockPct(item);
                return (
                  <Card key={item.id} className={`h-full ${isLow ? 'border-destructive/40' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.item_code}</p>
                        </div>
                        {isLow && (
                          <Badge className="bg-destructive text-destructive-foreground text-xs shrink-0">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Low
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Stock: <strong className={`${isLow ? 'text-destructive' : 'text-foreground'}`}>{item.current_stock} {item.unit}</strong></span>
                          <span>Min: {item.min_stock}</span>
                        </div>
                        <Progress value={pct} className={`h-1.5 ${isLow ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`} />
                      </div>
                      {item.location && <p className="text-xs text-muted-foreground mt-2">📍 {item.location}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
