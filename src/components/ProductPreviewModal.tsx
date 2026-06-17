import React, { useState, useMemo, useEffect } from 'react';

type InfoItemDraft = {
  key: string;
  title: string;
  value: string;
  sortOrder: string;
  isActive: boolean;
};

type DocumentTypeOption = {
  DocumentTypeId: number;
  Code: string;
  Extension: string;
};

type RuleDraft = {
  id: string;
  conditions: { attributeId: number | ''; attributeValueId: number | '' }[];
  unitPrice: string;
  compareAtPrice: string;
  costPerItem: string;
  priority: string;
  ruleName: string;
  sku: string;
  barcode: string;
};

type SavedAttribute = {
  AttributeID: number;
  AttributeName: string;
  AffectsPricing: boolean;
  AttributeValues: {
    ValueID: number;
    ValueName: string;
  }[];
};

type ProductPreviewModalProps = {
  productName: string;
  description?: string;
  attributes: Array<{ name: string; affectsPricing: boolean; values: string[] }>;
  minUploads?: string;
  maxUploads?: string;
  primaryImageUrl?: string;

  enableOrderQuantity?: boolean;
  minOrderQuantity?: string;
  maxOrderQuantity?: string;

  enableCustomDescription?: boolean;
  customDescriptionLabel?: string;
  customDescriptionPlaceholder?: string;

  documentTypes?: DocumentTypeOption[];
  allowedDocumentTypeIds?: number[];

  infoItems?: InfoItemDraft[];
  rules?: RuleDraft[];
  savedAttributes?: SavedAttribute[];
};

export default function ProductPreviewModal({
  productName,
  description,
  attributes,
  minUploads,
  maxUploads,
  primaryImageUrl,
  enableOrderQuantity,
  minOrderQuantity,
  maxOrderQuantity,
  enableCustomDescription,
  customDescriptionLabel,
  customDescriptionPlaceholder,
  documentTypes,
  allowedDocumentTypeIds,
  infoItems,
  rules,
  savedAttributes,
}: ProductPreviewModalProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState<number | ''>(1);

  useEffect(() => {
    if (attributes) {
      const initial: Record<string, string> = {};
      attributes.forEach(attr => {
        if (attr.values.length > 0) {
          initial[attr.name] = attr.values[0];
        }
      });
      setSelections(prev => {
        const next = { ...initial };
        Object.keys(prev).forEach(k => {
          if (attributes.find(a => a.name === k)?.values.includes(prev[k])) {
            next[k] = prev[k];
          }
        });
        return next;
      });
    }
  }, [attributes]);

  useEffect(() => {
    setQuantity(Number(minOrderQuantity) || 1);
  }, [minOrderQuantity]);

  const uploadMin = minUploads !== undefined && minUploads !== '' ? Number(minUploads) : 1;
  const uploadMax = maxUploads !== undefined && maxUploads !== '' ? Number(maxUploads) : 9;
  const uploadMinDisplay = minUploads !== undefined && minUploads !== '' ? minUploads : 'not set';
  const uploadMaxDisplay = maxUploads !== undefined && maxUploads !== '' ? maxUploads : 'not set';
  const isUploadInvalid = uploadMinDisplay !== 'not set' && uploadMaxDisplay !== 'not set' && Number(maxUploads) < Number(minUploads);

  const qtyMin = minOrderQuantity !== undefined && minOrderQuantity !== '' ? Number(minOrderQuantity) : 1;
  const qtyMax = maxOrderQuantity !== undefined && maxOrderQuantity !== '' ? Number(maxOrderQuantity) : 9999;

  // Calculate REAL price by matching selections against the saved rules
  const mockBasePrice = useMemo(() => {
    if (!rules || rules.length === 0) {
      return 0;
    }

    // Step 1: Map current selections to ValueIDs
    const selectedValueIds = new Set<number>();
    
    if (savedAttributes && savedAttributes.length > 0) {
      Object.entries(selections).forEach(([attrName, valName]) => {
        const savedAttr = savedAttributes.find(sa => sa.AttributeName.trim().toLowerCase() === attrName.trim().toLowerCase() && sa.AffectsPricing);
        if (savedAttr) {
          const savedVal = savedAttr.AttributeValues.find(v => v.ValueName.trim().toLowerCase() === valName.trim().toLowerCase());
          if (savedVal) {
            selectedValueIds.add(savedVal.ValueID);
          }
        }
      });
    }

    // Step 2: Find all matching rules
    const matchedRules: Array<{ rule: RuleDraft; matchCount: number }> = [];

    for (const rule of rules) {
      if (!rule.unitPrice || isNaN(Number(rule.unitPrice))) continue;
      
      const conditions = rule.conditions || [];
      const validConditions = conditions.filter(c => c.attributeId !== '' && c.attributeValueId !== '');
      
      // If rule has 0 valid conditions, it's a fallback rule
      if (validConditions.length === 0) {
        matchedRules.push({ rule, matchCount: 0 });
        continue;
      }

      // Check if all conditions are met
      const allConditionsMet = validConditions.every(c => selectedValueIds.has(c.attributeValueId as number));
      if (allConditionsMet) {
        matchedRules.push({ rule, matchCount: validConditions.length });
      }
    }

    if (matchedRules.length > 0) {
      // Sort to find the best match
      matchedRules.sort((a, b) => {
        // 1. Compare priority (lower numerical value = higher priority)
        const priorityA = Number(a.rule.priority) || 999999;
        const priorityB = Number(b.rule.priority) || 999999;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        // 2. Tie-breaker: prefer rules with MORE matching conditions (more specific)
        return b.matchCount - a.matchCount;
      });

      return Number(matchedRules[0].rule.unitPrice);
    }

    // If no specific or valid condition matched, check if there's any rule with a unitPrice to use as general fallback
    const firstRuleWithPrice = rules.find(r => r.unitPrice && !isNaN(Number(r.unitPrice)));
    if (firstRuleWithPrice) {
      return Number(firstRuleWithPrice.unitPrice);
    }

    return 0;
  }, [selections, rules, savedAttributes]);

  const estimatedPrice = mockBasePrice * (typeof quantity === 'number' ? quantity : qtyMin);

  const allowedDocs = documentTypes?.filter(d => allowedDocumentTypeIds?.includes(d.DocumentTypeId)) || [];
  const activeInfoItems = infoItems?.filter(i => i.isActive && i.title && i.value) || [];

  return (
    <div className="sticky top-24 w-[680px] shrink-0 h-[calc(100vh-8rem)] z-20 flex flex-col transition-all duration-300">
      <div className="bg-white rounded-2xl w-full h-full overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col border border-gray-200">
        {/* Content */}
        <div className="grid grid-cols-2 p-5 gap-5 overflow-y-auto flex-1 hide-scrollbar bg-white items-start">
          
          {/* Left - Preview Image Card */}
          <div className="w-full">
            <div className="bg-white rounded-[20px] border border-gray-200 p-4 sticky top-0">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-[16px] font-bold text-[#1e293b] leading-tight">Preview</h2>
                  <p className="text-[12px] text-slate-500 mt-0.5">{productName || 'Product reference preview'}</p>
                  {description && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{description}</p>}
                </div>
                <button
                  disabled
                  className="bg-[#1e293b] text-white text-[12px] font-medium px-4 py-2 rounded-lg cursor-default pointer-events-none"
                >
                  Upload Files
                </button>
              </div>

              <div className="aspect-square bg-[#f8fafc] rounded-2xl flex items-center justify-center mb-4 relative overflow-hidden">
                {primaryImageUrl ? (
                  <img src={primaryImageUrl} alt="Product Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-8 flex flex-col items-center justify-center w-full h-full bg-[#f8fafc]">
                    <h3 className="text-5xl font-black text-slate-900 leading-none tracking-tighter" style={{ WebkitTextStroke: '1px black', color: 'white' }}>
                      GET A<br />PRINT
                    </h3>
                    <div className="absolute inset-0 pointer-events-none opacity-[0.15] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 via-pink-500 to-yellow-500"></div>
                  </div>
                )}
              </div>

              <div className={`rounded-xl p-3 text-[12px] text-center font-medium ${isUploadInvalid ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-[#f8fafc] text-slate-500'}`}>
                {isUploadInvalid 
                  ? `Invalid Policy: Max (${uploadMaxDisplay}) cannot be less than Min (${uploadMinDisplay})`
                  : `Upload required: minimum ${uploadMinDisplay}, maximum ${uploadMaxDisplay}`
                }
              </div>
            </div>
          </div>

          {/* Right - Customization & Summary */}
          <div className="w-full space-y-5">
            <div className="bg-[#f8fafc] rounded-[20px] p-5">
              <h2 className="text-[15px] font-bold text-[#1e293b] mb-1.5">Customize Options</h2>
              <p className="text-[12px] text-slate-500 mb-5">Choose the combination that matches your requirement.</p>

              <div className="space-y-6">
                {attributes.map((attr, index) => (
                  <div key={attr.name}>
                    <label className="block text-[13px] font-bold text-[#1e293b] mb-2">
                      Step {index + 1}: {attr.name}
                    </label>
                    {attr.values.length > 0 ? (
                      <div className="relative">
                        <select
                          value={selections[attr.name] || ''}
                          onChange={(e) => setSelections(prev => ({ ...prev, [attr.name]: e.target.value }))}
                          className="w-full px-4 py-3 text-[13px] rounded-xl border border-gray-200 text-[#1e293b] bg-white focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b] outline-none appearance-none cursor-pointer"
                        >
                          {attr.values.map(val => (
                            <option key={val} value={val}>
                              {val}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                          <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-[13px] rounded-xl border border-gray-200 text-gray-400 bg-white italic">
                        No options defined
                      </div>
                    )}
                  </div>
                ))}

                {enableOrderQuantity && (
                  <div>
                    <label className="block text-[13px] font-bold text-[#1e293b] mb-2">
                      Order Quantity
                    </label>
                    <input
                      type="number"
                      min={qtyMin}
                      max={qtyMax}
                      value={quantity === '' ? '' : quantity}
                      onChange={(e) => {
                        if (e.target.value === '') {
                          setQuantity('');
                          return;
                        }
                        let val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setQuantity(val);
                        }
                      }}
                      onBlur={() => {
                        let val = typeof quantity === 'number' ? quantity : parseInt(quantity as any, 10);
                        if (isNaN(val) || val < qtyMin) val = qtyMin;
                        if (val > qtyMax) val = qtyMax;
                        setQuantity(val);
                      }}
                      className="w-full sm:w-32 px-4 py-2.5 text-[13px] rounded-xl border border-gray-200 text-[#1e293b] bg-white focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b] outline-none"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Min: {qtyMin}, Max: {qtyMax}</p>
                  </div>
                )}

                {enableCustomDescription && (
                  <div>
                    <label className="block text-[13px] font-bold text-[#1e293b] mb-2">
                      {customDescriptionLabel || 'Custom Description'}
                    </label>
                    <textarea
                      placeholder={customDescriptionPlaceholder || 'Enter your description here...'}
                      rows={3}
                      className="w-full px-4 py-2.5 text-[13px] rounded-xl border border-gray-200 text-[#1e293b] bg-white focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b] outline-none resize-none"
                    />
                  </div>
                )}

                {attributes.length === 0 && !enableOrderQuantity && !enableCustomDescription && (
                  <p className="text-[13px] text-slate-500 italic p-4 bg-white rounded-xl border border-gray-200">
                    No attributes configured.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-[#f8fafc] rounded-[20px] p-5">
              <h2 className="text-[15px] font-bold text-[#1e293b] mb-5">Order Summary</h2>

              <div className="space-y-3 mb-5 border-b border-gray-200 pb-5">
                {attributes.map(attr => (
                  <div key={attr.name} className="flex justify-between items-center text-[12px]">
                    <span className="text-slate-500 font-medium">{attr.name}</span>
                    <span className="font-bold text-[#1e293b]">{selections[attr.name] || '-'}</span>
                  </div>
                ))}
                {enableOrderQuantity && (
                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-slate-500 font-medium">Quantity</span>
                    <span className="font-bold text-[#1e293b]">{quantity}</span>
                  </div>
                )}
                {attributes.length === 0 && !enableOrderQuantity && (
                  <div className="text-[12px] text-slate-400 italic">No configuration</div>
                )}
              </div>

              <div className="bg-white rounded-xl p-4 mb-5 border border-gray-100">
                <p className="text-[12px] text-slate-400 font-medium mb-1">Estimated price</p>
                <div className="text-[20px] font-bold text-[#1e293b] mb-2">₹ {estimatedPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                <p className="text-[11px] text-emerald-600 font-medium leading-relaxed">
                  Price is dynamically updating based on your selection. Real-time calculations will be applied on the live storefront.
                </p>
              </div>

              <div className="pt-1 space-y-4">
                <div>
                  <h3 className="text-[13px] font-bold text-[#1e293b] mb-1">Upload Policy</h3>
                  <p className={`text-[12px] font-medium mb-1 ${isUploadInvalid ? 'text-red-500' : 'text-slate-500'}`}>
                    {isUploadInvalid
                      ? `Invalid: Maximum (${uploadMaxDisplay}) < Minimum (${uploadMinDisplay})`
                      : `Uploads required: ${uploadMinDisplay} to ${uploadMaxDisplay}`
                    }
                  </p>
                  {allowedDocs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {allowedDocs.map(doc => (
                        <span key={doc.DocumentTypeId} className="px-2 py-1 text-[10px] font-bold bg-[#1e293b] text-white rounded-md">
                          {doc.Code}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {activeInfoItems.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-[13px] font-bold text-[#1e293b] mb-3">Important Information</h3>
                    <div className="space-y-3">
                      {activeInfoItems.map(item => (
                        <div key={item.key}>
                          <h4 className="text-[12px] font-bold text-slate-700">{item.title}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 whitespace-pre-wrap">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
