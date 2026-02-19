import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/axios';

type AttributeEditor = {
  name: string;
  values: string[];
};

type SavedAttributeValue = {
  ValueID: number;
  ValueName: string;
};

type SavedAttribute = {
  AttributeID: number;
  AttributeName: string;
  AttributeValues: SavedAttributeValue[];
};

type ProductDetailsResponse = {
  ProductID: number;
  ProductName?: string;
  Attributes?: Array<{
    AttributeID?: number;
    AttributeName: string;
    AttributeValues?: SavedAttributeValue[];
    Values?: string[];
  }>;
};

type DocumentTypeOption = {
  DocumentTypeId: number;
  Code: string;
  DisplayName: string;
  MimeType?: string | null;
  Extension: string;
};

type MetaConfigResponse = {
  ProductId: number;
  UploadConfig?: {
    IsUploadMandatory?: boolean;
    MinUploads?: number | null;
    MaxUploads?: number | null;
    AllowedDocumentTypeIds?: number[];
  };
  InfoItems?: Array<{
    ProductInfoItemId?: number;
    Title?: string;
    Value?: string;
    SortOrder?: number;
    IsActive?: boolean;
  }>;
};

type InfoItemDraft = {
  key: string;
  title: string;
  value: string;
  sortOrder: string;
  isActive: boolean;
};

type RuleDraft = {
  conditions: Array<{
    attributeId: number | '';
    attributeValueId: number | '';
  }>;
  unitPrice: string;
  priority: string;
  priceType: number;
};

const PRICING_STRATEGIES = [
  { value: 0, label: 'Generic Matrix' },
];

const PRICE_TYPES = [
  { value: 0, label: 'Flat' },
  { value: 1, label: 'Per Unit' },
  { value: 2, label: 'Per Area' },
  { value: 3, label: 'Per Page' },
];

const createEmptyRule = (index: number): RuleDraft => ({
  conditions: [{ attributeId: '', attributeValueId: '' }],
  unitPrice: '',
  priority: String(index + 1),
  priceType: 0,
});

const normalizeRuleToken = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'UNSPECIFIED';

const buildUniqueRuleName = (tokens: string[], usedNames: Set<string>): string => {
  const base = `RULE_${tokens.map(normalizeRuleToken).join('__') || 'UNSPECIFIED'}`;
  if (!usedNames.has(base)) {
    usedNames.add(base);
    return base;
  }

  let suffix = 2;
  let candidate = `${base}_${suffix}`;
  while (usedNames.has(candidate)) {
    suffix += 1;
    candidate = `${base}_${suffix}`;
  }
  usedNames.add(candidate);
  return candidate;
};

const dedupeCaseInsensitive = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(value.trim());
  }
  return result;
};

export default function NewProductPage() {
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [pricingStrategy, setPricingStrategy] = useState(0);
  const [productId, setProductId] = useState<number | null>(null);

  const [attributes, setAttributes] = useState<AttributeEditor[]>([]);
  const [attributeNameInput, setAttributeNameInput] = useState('');
  const [selectedAttributeName, setSelectedAttributeName] = useState('');
  const [attributeValueInput, setAttributeValueInput] = useState('');

  const [savedAttributes, setSavedAttributes] = useState<SavedAttribute[]>([]);

  const [rules, setRules] = useState<RuleDraft[]>([createEmptyRule(0)]);
  const [replaceRules, setReplaceRules] = useState(true);

  const [savingBasics, setSavingBasics] = useState(false);
  const [savingAttributes, setSavingAttributes] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [basicsMessage, setBasicsMessage] = useState<string | null>(null);
  const [attributesMessage, setAttributesMessage] = useState<string | null>(null);
  const [pricingMessage, setPricingMessage] = useState<string | null>(null);
  const [metaMessage, setMetaMessage] = useState<string | null>(null);

  const [documentTypes, setDocumentTypes] = useState<DocumentTypeOption[]>([]);
  const [isUploadMandatory, setIsUploadMandatory] = useState(false);
  const [minUploads, setMinUploads] = useState('');
  const [maxUploads, setMaxUploads] = useState('');
  const [allowedDocumentTypeIds, setAllowedDocumentTypeIds] = useState<number[]>([]);
  const [infoItems, setInfoItems] = useState<InfoItemDraft[]>([
    { key: 'info-1', title: '', value: '', sortOrder: '1', isActive: true },
  ]);

  const selectedAttributeEditor = useMemo(
    () => attributes.find((attribute) => attribute.name === selectedAttributeName),
    [attributes, selectedAttributeName],
  );

  const effectivePricingStrategy = pricingStrategy === 1 ? 0 : pricingStrategy;

  const extractProductId = (responseData: any): number | null => {
    if (typeof responseData === 'number') return responseData;
    if (typeof responseData?.Data === 'number') return responseData.Data;
    if (typeof responseData?.data === 'number') return responseData.data;
    return null;
  };

  const toCatalogPayloadAttributes = () =>
    attributes
      .map((attribute) => ({
        AttributeName: attribute.name.trim(),
        Values: dedupeCaseInsensitive(attribute.values),
      }))
      .filter((attribute) => attribute.AttributeName.length > 0);

  const toMetaInfoPayload = () =>
    infoItems
      .map((item, index) => ({
        Title: item.title.trim(),
        Value: item.value.trim(),
        SortOrder: Number(item.sortOrder || index + 1),
        IsActive: item.isActive,
      }))
      .filter((item) => item.Title.length > 0 && item.Value.length > 0);

  const fetchDocumentTypes = async () => {
    try {
      const res = await api.get<DocumentTypeOption[]>('/api/products/master/document-types');
      setDocumentTypes(Array.isArray(res.data) ? res.data : []);
    } catch {
      setDocumentTypes([]);
    }
  };

  const loadMetaConfig = async (id: number) => {
    setLoadingMeta(true);
    try {
      const res = await api.get<MetaConfigResponse>(`/api/products/${id}/meta-config`);
      const upload = res.data?.UploadConfig;
      setIsUploadMandatory(Boolean(upload?.IsUploadMandatory));
      setMinUploads(upload?.MinUploads !== undefined && upload?.MinUploads !== null ? String(upload.MinUploads) : '');
      setMaxUploads(upload?.MaxUploads !== undefined && upload?.MaxUploads !== null ? String(upload.MaxUploads) : '');
      setAllowedDocumentTypeIds(
        Array.isArray(upload?.AllowedDocumentTypeIds) ? upload?.AllowedDocumentTypeIds ?? [] : [],
      );

      const mappedInfo = Array.isArray(res.data?.InfoItems)
        ? res.data.InfoItems.map((item, index) => ({
            key: `info-${item.ProductInfoItemId || index + 1}`,
            title: item.Title || '',
            value: item.Value || '',
            sortOrder: String(item.SortOrder ?? index + 1),
            isActive: item.IsActive ?? true,
          }))
        : [];

      setInfoItems(
        mappedInfo.length > 0
          ? mappedInfo
          : [{ key: 'info-1', title: '', value: '', sortOrder: '1', isActive: true }],
      );
    } catch {
      setInfoItems([{ key: 'info-1', title: '', value: '', sortOrder: '1', isActive: true }]);
    } finally {
      setLoadingMeta(false);
    }
  };

  const loadSavedAttributes = async (id: number) => {
    const detailsRes = await api.get<ProductDetailsResponse>(`/api/products/details-with-pricing-v2/${id}`);
    const rawAttributes = Array.isArray(detailsRes.data?.Attributes) ? detailsRes.data.Attributes : [];
    const mapped: SavedAttribute[] = rawAttributes.map((attribute, index) => {
      const explicitValues = Array.isArray(attribute.AttributeValues) ? attribute.AttributeValues : [];
      const fallbackValues = Array.isArray(attribute.Values)
        ? attribute.Values.map((value, valueIndex) => ({
            ValueID: valueIndex + 1,
            ValueName: value,
          }))
        : [];
      return {
        AttributeID: Number(attribute.AttributeID || index + 1),
        AttributeName: attribute.AttributeName,
        AttributeValues: explicitValues.length > 0 ? explicitValues : fallbackValues,
      };
    });
    setSavedAttributes(mapped);

    // Keep UI editor synced with what backend persisted.
    const syncedEditor = mapped.map((attribute) => ({
      name: attribute.AttributeName,
      values: attribute.AttributeValues.map((value) => value.ValueName),
    }));
    setAttributes(syncedEditor);
    if (syncedEditor.length > 0) {
      const exists = syncedEditor.some((item) => item.name === selectedAttributeName);
      if (!exists) setSelectedAttributeName(syncedEditor[0].name);
    } else {
      setSelectedAttributeName('');
    }
  };

  useEffect(() => {
    fetchDocumentTypes();
  }, []);

  useEffect(() => {
    if (!productId) return;
    loadMetaConfig(productId);
  }, [productId]);

  const handleSaveBasics = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBasicsMessage(null);
    setAttributesMessage(null);
    setPricingMessage(null);
    setMetaMessage(null);

    const cleanProductName = productName.trim();
    if (!cleanProductName) {
      setError('Product name is required.');
      return;
    }

    setSavingBasics(true);
    try {
      if (!productId) {
        const createPayload = {
          ProductName: cleanProductName,
          Description: description.trim() || null,
          PricingStrategy: effectivePricingStrategy,
          Attributes: [],
          Addons: [],
        };
        const createRes = await api.post('/api/products', createPayload);
        const createdId = extractProductId(createRes.data);
        if (!createdId) throw new Error('Unable to read product id from create response.');
        setProductId(createdId);
        await loadSavedAttributes(createdId);
        setBasicsMessage(`Basics saved. Product created with ID ${createdId}.`);
      } else {
        const payload = {
          ProductName: cleanProductName,
          Description: description.trim() || null,
          PricingStrategy: effectivePricingStrategy,
          ReplaceAttributes: false,
          ReplaceAddons: false,
          Attributes: [],
          Addons: [],
        };
        await api.put(`/api/products/${productId}/catalog-config`, payload);
        setBasicsMessage(`Basics updated for Product ID ${productId}.`);
      }
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
      setError(apiMessage || err?.message || 'Failed to save product basics.');
    } finally {
      setSavingBasics(false);
    }
  };

  const addAttributeName = () => {
    const name = attributeNameInput.trim();
    if (!name) return;

    const exists = attributes.some((attribute) => attribute.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setError(`Attribute '${name}' already exists.`);
      return;
    }

    setError(null);
    setAttributes((prev) => [...prev, { name, values: [] }]);
    setSelectedAttributeName(name);
    setAttributeNameInput('');
  };

  const removeAttributeName = (name: string) => {
    setAttributes((prev) => prev.filter((attribute) => attribute.name !== name));
    if (selectedAttributeName === name) {
      const next = attributes.find((attribute) => attribute.name !== name)?.name || '';
      setSelectedAttributeName(next);
    }
  };

  const addValueToSelectedAttribute = () => {
    const value = attributeValueInput.trim();
    if (!selectedAttributeName || !value) return;

    setError(null);
    setAttributes((prev) =>
      prev.map((attribute) => {
        if (attribute.name !== selectedAttributeName) return attribute;
        const exists = attribute.values.some((item) => item.toLowerCase() === value.toLowerCase());
        if (exists) return attribute;
        return { ...attribute, values: [...attribute.values, value] };
      }),
    );
    setAttributeValueInput('');
  };

  const handleAttributeSelectionChange = (nextAttributeName: string) => {
    if (nextAttributeName === selectedAttributeName) return;

    const pendingValue = attributeValueInput.trim();
    if (pendingValue && selectedAttributeName) {
      const shouldSaveBeforeSwitch = window.confirm(
        `You have an unsaved value "${pendingValue}" for "${selectedAttributeName}". Click OK to save it before switching. Click Cancel to discard it and continue.`,
      );

      if (shouldSaveBeforeSwitch) {
        setAttributes((prev) =>
          prev.map((attribute) => {
            if (attribute.name !== selectedAttributeName) return attribute;
            const exists = attribute.values.some((item) => item.toLowerCase() === pendingValue.toLowerCase());
            if (exists) return attribute;
            return { ...attribute, values: [...attribute.values, pendingValue] };
          }),
        );
      }

      setAttributeValueInput('');
    }

    setSelectedAttributeName(nextAttributeName);
  };

  const removeValueFromSelectedAttribute = (value: string) => {
    if (!selectedAttributeName) return;
    setAttributes((prev) =>
      prev.map((attribute) =>
        attribute.name === selectedAttributeName
          ? { ...attribute, values: attribute.values.filter((item) => item !== value) }
          : attribute,
      ),
    );
  };

  const handleSaveAttributesAndValues = async () => {
    setError(null);
    setAttributesMessage(null);
    setPricingMessage(null);

    if (!productId) {
      setError('Save basics first to create a product.');
      return;
    }
    if (attributes.length === 0) {
      setError('Add at least one attribute.');
      return;
    }

    const duplicateNames = attributes
      .map((attribute) => attribute.name.trim().toLowerCase())
      .filter(Boolean)
      .filter((name, index, list) => list.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      setError('Attribute names must be unique.');
      return;
    }

    const catalogAttributes = toCatalogPayloadAttributes();

    setSavingAttributes(true);
    try {
      const payload = {
        ProductName: productName.trim(),
        Description: description.trim() || null,
        PricingStrategy: effectivePricingStrategy,
        ReplaceAttributes: true,
        ReplaceAddons: false,
        Attributes: catalogAttributes,
        Addons: [],
      };
      await api.put(`/api/products/${productId}/catalog-config`, payload);
      await loadSavedAttributes(productId);
      setRules([createEmptyRule(0)]); // IDs can change after replace
      setAttributesMessage('Attributes and values saved successfully.');
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
      setError(apiMessage || err?.message || 'Failed to save attributes and values.');
    } finally {
      setSavingAttributes(false);
    }
  };

  const getAttributeById = (id: number | '') =>
    savedAttributes.find((attribute) => attribute.AttributeID === id);

  const updateRule = (index: number, patch: Partial<RuleDraft>) => {
    setRules((prev) => prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  };

  const updateRuleCondition = (
    ruleIndex: number,
    conditionIndex: number,
    patch: Partial<{ attributeId: number | ''; attributeValueId: number | '' }>,
  ) => {
    setRules((prev) =>
      prev.map((rule, i) => {
        if (i !== ruleIndex) return rule;
        const nextConditions = rule.conditions.map((condition, ci) => {
          if (ci !== conditionIndex) return condition;
          const next = { ...condition, ...patch };
          if (patch.attributeId !== undefined && patch.attributeId !== condition.attributeId) {
            next.attributeValueId = '';
          }
          return next;
        });
        return { ...rule, conditions: nextConditions };
      }),
    );
  };

  const addConditionToRule = (ruleIndex: number) => {
    setRules((prev) =>
      prev.map((rule, index) =>
        index === ruleIndex
          ? {
              ...rule,
              conditions: [...rule.conditions, { attributeId: '', attributeValueId: '' }],
            }
          : rule,
      ),
    );
  };

  const removeConditionFromRule = (ruleIndex: number, conditionIndex: number) => {
    setRules((prev) =>
      prev.map((rule, index) => {
        if (index !== ruleIndex) return rule;
        if (rule.conditions.length === 1) return rule;
        return {
          ...rule,
          conditions: rule.conditions.filter((_, ci) => ci !== conditionIndex),
        };
      }),
    );
  };

  const removeRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSavePricing = async () => {
    setError(null);
    setPricingMessage(null);

    if (!productId) {
      setError('Save basics first.');
      return;
    }
    if (savedAttributes.length === 0) {
      setError('Save attributes first before configuring pricing.');
      return;
    }

    const validRules = rules.filter(
      (rule) =>
        rule.unitPrice !== '' &&
        rule.conditions.length > 0 &&
        rule.conditions.every(
          (condition) => condition.attributeId !== '' && condition.attributeValueId !== '',
        ),
    );
    if (validRules.length === 0) {
      setError('Add at least one complete pricing rule.');
      return;
    }

    const hasDuplicateConditions = validRules.some((rule) => {
      const attributeIds = rule.conditions.map((condition) => condition.attributeId);
      return new Set(attributeIds).size !== attributeIds.length;
    });
    if (hasDuplicateConditions) {
      setError('A rule cannot contain the same attribute more than once.');
      return;
    }

    setSavingPricing(true);
    try {
      const usedRuleNames = new Set<string>();
      const payloadRules = validRules.map((rule) => {
        const ruleNameTokens = rule.conditions.map((condition) => {
          const selectedAttribute = savedAttributes.find(
            (attribute) => attribute.AttributeID === Number(condition.attributeId),
          );
          const selectedValue = selectedAttribute?.AttributeValues.find(
            (value) => value.ValueID === Number(condition.attributeValueId),
          );
          return `${selectedAttribute?.AttributeName || 'ATTRIBUTE'}_${selectedValue?.ValueName || 'VALUE'}`;
        });

        return {
          RuleName: buildUniqueRuleName(ruleNameTokens, usedRuleNames),
          PriceType: Number(rule.priceType),
          UnitPrice: Number(rule.unitPrice),
          MultiplierInputKey: null,
          MinMultiplier: null,
          MaxMultiplier: null,
          IsActive: true,
          Priority: Number(rule.priority || 100),
          ValidFrom: null,
          ValidTo: null,
          Conditions: rule.conditions.map((condition) => ({
            AttributeId: Number(condition.attributeId),
            AttributeValueId: Number(condition.attributeValueId),
          })),
        };
      });

      const payload = {
        PricingStrategy: effectivePricingStrategy,
        ReplaceRules: replaceRules,
        InputDefinitions: [],
        Rules: payloadRules,
      };

      await api.put(`/api/products/${productId}/pricing-config`, payload);
      setPricingMessage('Pricing rules saved successfully.');
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
      setError(apiMessage || err?.message || 'Failed to save pricing rules.');
    } finally {
      setSavingPricing(false);
    }
  };

  const toggleAllowedDocumentType = (documentTypeId: number) => {
    setAllowedDocumentTypeIds((prev) =>
      prev.includes(documentTypeId)
        ? prev.filter((id) => id !== documentTypeId)
        : [...prev, documentTypeId],
    );
  };

  const updateInfoItem = (key: string, patch: Partial<InfoItemDraft>) => {
    setInfoItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const addInfoItem = () => {
    setInfoItems((prev) => [
      ...prev,
      {
        key: `info-${Date.now()}-${prev.length + 1}`,
        title: '',
        value: '',
        sortOrder: String(prev.length + 1),
        isActive: true,
      },
    ]);
  };

  const removeInfoItem = (key: string) => {
    setInfoItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((item) => item.key !== key);
    });
  };

  const handleSaveMetaConfig = async () => {
    setError(null);
    setMetaMessage(null);

    if (!productId) {
      setError('Save basics first to create a product.');
      return;
    }

    const minValue = minUploads.trim() === '' ? null : Number(minUploads);
    const maxValue = maxUploads.trim() === '' ? null : Number(maxUploads);

    if (isUploadMandatory) {
      if (minValue === null || maxValue === null) {
        setError('Min and Max uploads are required when upload is mandatory.');
        return;
      }
      if (minValue < 1) {
        setError('Min uploads must be at least 1 when upload is mandatory.');
        return;
      }
      if (maxValue < minValue) {
        setError('Max uploads must be greater than or equal to Min uploads.');
        return;
      }
      if (allowedDocumentTypeIds.length === 0) {
        setError('Select at least one allowed document type when upload is mandatory.');
        return;
      }
    }

    setSavingMeta(true);
    try {
      const payload = {
        UploadConfig: {
          IsUploadMandatory: isUploadMandatory,
          MinUploads: minValue,
          MaxUploads: maxValue,
          AllowedDocumentTypeIds: allowedDocumentTypeIds,
        },
        InfoItems: toMetaInfoPayload(),
      };

      await api.put(`/api/products/${productId}/meta-config`, payload);
      setMetaMessage('Upload policy and info items saved successfully.');
      await loadMetaConfig(productId);
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.Message;
      setError(apiMessage || err?.message || 'Failed to save product metadata.');
    } finally {
      setSavingMeta(false);
    }
  };

  const canConfigureAttributes = productId !== null;
  const canConfigurePricing = productId !== null && savedAttributes.length > 0;
  const canConfigureMeta = productId !== null;

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">Create Product</h1>
            <p className="text-gray-500">
              Workflow: 1) Basics, 2) Attributes then Values, 3) Pricing Rules.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back to Products
          </Link>
        </div>

        <form onSubmit={handleSaveBasics} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">1. Basics</h2>
            {productId ? (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                Product ID: {productId}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Fridge Magnet"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Strategy</label>
              <select
                value={pricingStrategy}
                onChange={(e) => setPricingStrategy(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PRICING_STRATEGIES.map((strategy) => (
                  <option key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingBasics}
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {savingBasics ? 'Saving Basics...' : productId ? 'Update Basics' : 'Save Basics'}
            </button>
          </div>
        </form>

        <div className={`space-y-4 rounded-2xl border p-6 shadow-sm ${canConfigureAttributes ? 'border-gray-100 bg-white' : 'border-gray-200 bg-gray-50'}`}>
          <h2 className="text-lg font-semibold text-gray-900">2. Attributes & Values</h2>
          <p className="text-sm text-gray-600">
            Add all attributes first. Then pick one attribute and add its values.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Add Attribute Name</label>
              <div className="flex gap-2">
                <input
                  value={attributeNameInput}
                  onChange={(e) => setAttributeNameInput(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Shape"
                  disabled={!canConfigureAttributes}
                />
                <button
                  type="button"
                  onClick={addAttributeName}
                  disabled={!canConfigureAttributes}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {attributes.length === 0 ? (
                  <p className="text-sm text-gray-500">No attributes added.</p>
                ) : (
                  attributes.map((attribute) => (
                    <div key={attribute.name} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleAttributeSelectionChange(attribute.name)}
                        className={`text-sm font-medium ${selectedAttributeName === attribute.name ? 'text-blue-700' : 'text-gray-700'}`}
                      >
                        {attribute.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAttributeName(attribute.name)}
                        className="text-xs font-medium text-red-700 hover:text-red-800"
                        disabled={!canConfigureAttributes}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Manage Values for Selected Attribute</label>
              <select
                value={selectedAttributeName}
                onChange={(e) => handleAttributeSelectionChange(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                disabled={!canConfigureAttributes || attributes.length === 0}
              >
                <option value="">Select attribute</option>
                {attributes.map((attribute) => (
                  <option key={attribute.name} value={attribute.name}>
                    {attribute.name}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <input
                  value={attributeValueInput}
                  onChange={(e) => setAttributeValueInput(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Matte"
                  disabled={!canConfigureAttributes || !selectedAttributeName}
                />
                <button
                  type="button"
                  onClick={addValueToSelectedAttribute}
                  disabled={!canConfigureAttributes || !selectedAttributeName}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {!selectedAttributeEditor ? (
                  <p className="text-sm text-gray-500">Select an attribute to add values.</p>
                ) : selectedAttributeEditor.values.length === 0 ? (
                  <p className="text-sm text-gray-500">No values yet for {selectedAttributeEditor.name}.</p>
                ) : (
                  selectedAttributeEditor.values.map((value) => (
                    <div key={value} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
                      <span className="text-sm text-gray-700">{value}</span>
                      <button
                        type="button"
                        onClick={() => removeValueFromSelectedAttribute(value)}
                        className="text-xs font-medium text-red-700 hover:text-red-800"
                        disabled={!canConfigureAttributes}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveAttributesAndValues}
              disabled={!canConfigureAttributes || savingAttributes}
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {savingAttributes ? 'Saving Attributes...' : 'Save Attributes & Values'}
            </button>
          </div>

          {savedAttributes.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Saved Attributes & Values</h3>
              <div className="space-y-3">
                {savedAttributes.map((attribute) => (
                  <div key={attribute.AttributeID} className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="text-sm font-medium text-gray-900">
                      {attribute.AttributeName}{' '}
                      <span className="text-xs font-normal text-gray-500">(AttributeID: {attribute.AttributeID})</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {attribute.AttributeValues.length === 0 ? (
                        <span className="text-xs text-gray-500">No values saved</span>
                      ) : (
                        attribute.AttributeValues.map((value) => (
                          <span
                            key={value.ValueID}
                            className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-800"
                          >
                            {value.ValueName}
                            <span className="ml-1 text-blue-600">(ID: {value.ValueID})</span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className={`space-y-4 rounded-2xl border p-6 shadow-sm ${canConfigurePricing ? 'border-gray-100 bg-white' : 'border-gray-200 bg-gray-50'}`}>
          <h2 className="text-lg font-semibold text-gray-900">3. Pricing Rules</h2>
          <p className="text-sm text-gray-600">
            Pricing becomes available after attributes and values are saved.
          </p>

          <div className="flex items-center gap-2">
            <input
              id="replace-rules"
              type="checkbox"
              checked={replaceRules}
              onChange={(e) => setReplaceRules(e.target.checked)}
              disabled={!canConfigurePricing}
              className="rounded border-gray-300"
            />
            <label htmlFor="replace-rules" className="text-sm text-gray-700">
              Replace existing rules on save
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Rule List</h3>
              <button
                type="button"
                onClick={() => setRules((prev) => [...prev, createEmptyRule(prev.length)])}
                disabled={!canConfigurePricing}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                + Add Rule
              </button>
            </div>

            {rules.map((rule, index) => {
              const ruleNameTokens = rule.conditions
                .map((condition) => {
                  if (condition.attributeId === '' || condition.attributeValueId === '') return null;
                  const attribute = getAttributeById(condition.attributeId);
                  const value = attribute?.AttributeValues.find(
                    (item) => item.ValueID === condition.attributeValueId,
                  );
                  if (!attribute || !value) return null;
                  return `${attribute.AttributeName}_${value.ValueName}`;
                })
                .filter((token): token is string => Boolean(token));
              const hasCompleteConditions =
                rule.conditions.length > 0 &&
                rule.conditions.every(
                  (condition) => condition.attributeId !== '' && condition.attributeValueId !== '',
                );

              return (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end rounded-xl border border-gray-100 p-3 bg-white">
                  <div className="md:col-span-5 space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Conditions</label>
                    {rule.conditions.map((condition, conditionIndex) => {
                      const selectedAttribute = getAttributeById(condition.attributeId);
                      const valueOptions = selectedAttribute?.AttributeValues || [];

                      return (
                        <div key={conditionIndex} className="flex flex-wrap items-center gap-2">
                          <select
                            value={condition.attributeId}
                            onChange={(e) =>
                              updateRuleCondition(index, conditionIndex, {
                                attributeId: e.target.value ? Number(e.target.value) : '',
                              })
                            }
                            className="min-w-[140px] flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                            disabled={!canConfigurePricing}
                          >
                            <option value="">Attribute</option>
                            {savedAttributes.map((attribute) => (
                              <option key={attribute.AttributeID} value={attribute.AttributeID}>
                                {attribute.AttributeName}
                              </option>
                            ))}
                          </select>

                          <select
                            value={condition.attributeValueId}
                            onChange={(e) =>
                              updateRuleCondition(index, conditionIndex, {
                                attributeValueId: e.target.value ? Number(e.target.value) : '',
                              })
                            }
                            className="min-w-[140px] flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                            disabled={!canConfigurePricing || condition.attributeId === ''}
                          >
                            <option value="">Value</option>
                            {valueOptions.map((value) => (
                              <option key={value.ValueID} value={value.ValueID}>
                                {value.ValueName}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => removeConditionFromRule(index, conditionIndex)}
                            disabled={!canConfigurePricing || rule.conditions.length === 1}
                            className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => addConditionToRule(index)}
                      disabled={!canConfigurePricing}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      + Add Condition
                    </button>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price Type</label>
                    <select
                      value={rule.priceType}
                      onChange={(e) => updateRule(index, { priceType: Number(e.target.value) })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                      disabled={!canConfigurePricing || !hasCompleteConditions}
                    >
                      {PRICE_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rule.unitPrice}
                      onChange={(e) => updateRule(index, { unitPrice: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                      disabled={!canConfigurePricing || !hasCompleteConditions}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <input
                      type="number"
                      min="1"
                      value={rule.priority}
                      onChange={(e) => updateRule(index, { priority: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                      disabled={!canConfigurePricing || !hasCompleteConditions}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <button
                      type="button"
                      onClick={() => removeRule(index)}
                      disabled={!canConfigurePricing || rules.length === 1}
                      className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="md:col-span-12">
                    {!hasCompleteConditions ? (
                      <p className="text-xs text-amber-700">
                        Complete all attribute/value conditions first, then set price type and unit price.
                      </p>
                    ) : null}
                    <p className="text-xs text-gray-500">
                      Rule Name (auto):{' '}
                      {ruleNameTokens.length > 0
                        ? buildUniqueRuleName(ruleNameTokens, new Set<string>())
                        : 'Select at least one attribute and value'}
                    </p>
                                        <p className="mt-1 text-xs text-gray-500">
                      Selected:{' '}
                      {rule.conditions
                        .map((condition) => {
                          if (condition.attributeId === '' || condition.attributeValueId === '') return null;
                          const attribute = getAttributeById(condition.attributeId);
                          const value = attribute?.AttributeValues.find(
                            (item) => item.ValueID === condition.attributeValueId,
                          );
                          if (!attribute || !value) return null;
                          return `${attribute.AttributeName}: ${value.ValueName}`;
                        })
                        .filter((item): item is string => Boolean(item))
                        .join(', ') || 'No conditions selected'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSavePricing}
              disabled={!canConfigurePricing || savingPricing}
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {savingPricing ? 'Saving Pricing...' : 'Save Pricing Rules'}
            </button>
          </div>
        </div>

        <div className={`space-y-4 rounded-2xl border p-6 shadow-sm ${canConfigureMeta ? 'border-gray-100 bg-white' : 'border-gray-200 bg-gray-50'}`}>
          <h2 className="text-lg font-semibold text-gray-900">4. Upload Policy & Info Items</h2>
          <p className="text-sm text-gray-600">Configure upload requirements and customer-facing product info rows.</p>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Is upload mandatory?</label>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="upload-mandatory"
                  checked={isUploadMandatory}
                  onChange={() => setIsUploadMandatory(true)}
                  disabled={!canConfigureMeta}
                />
                Yes
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="upload-mandatory"
                  checked={!isUploadMandatory}
                  onChange={() => setIsUploadMandatory(false)}
                  disabled={!canConfigureMeta}
                />
                No
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum uploads</label>
              <input
                type="number"
                min="0"
                value={minUploads}
                onChange={(e) => setMinUploads(e.target.value)}
                disabled={!canConfigureMeta}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maximum uploads</label>
              <input
                type="number"
                min="0"
                value={maxUploads}
                onChange={(e) => setMaxUploads(e.target.value)}
                disabled={!canConfigureMeta}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Allowed document types</label>
            {documentTypes.length === 0 ? (
              <p className="text-sm text-gray-500">No document types available from master data.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {documentTypes.map((type) => (
                  <label key={type.DocumentTypeId} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={allowedDocumentTypeIds.includes(type.DocumentTypeId)}
                      onChange={() => toggleAllowedDocumentType(type.DocumentTypeId)}
                      disabled={!canConfigureMeta}
                    />
                    {type.Code} ({type.Extension})
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Info items</label>
              <button
                type="button"
                onClick={addInfoItem}
                disabled={!canConfigureMeta}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                + Add Info Item
              </button>
            </div>
            {infoItems.map((item) => (
              <div key={item.key} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end rounded-xl border border-gray-100 p-3">
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                  <input
                    value={item.title}
                    onChange={(e) => updateInfoItem(item.key, { title: e.target.value })}
                    disabled={!canConfigureMeta}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-5">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
                  <input
                    value={item.value}
                    onChange={(e) => updateInfoItem(item.key, { value: e.target.value })}
                    disabled={!canConfigureMeta}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sort Order</label>
                  <input
                    type="number"
                    min="1"
                    value={item.sortOrder}
                    onChange={(e) => updateInfoItem(item.key, { sortOrder: e.target.value })}
                    disabled={!canConfigureMeta}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-1">
                  <button
                    type="button"
                    onClick={() => removeInfoItem(item.key)}
                    disabled={!canConfigureMeta || infoItems.length === 1}
                    className="w-full rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveMetaConfig}
              disabled={!canConfigureMeta || savingMeta || loadingMeta}
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {savingMeta ? 'Saving Metadata...' : 'Save Upload Policy & Info'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {basicsMessage ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{basicsMessage}</div>
        ) : null}
        {attributesMessage ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{attributesMessage}</div>
        ) : null}
        {pricingMessage ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {pricingMessage}{' '}
            <Link href="/products" className="font-semibold underline">
              View products
            </Link>
          </div>
        ) : null}
        {metaMessage ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{metaMessage}</div>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}

