# Metadata Extraction System - Purpose and Design

## Why We Extract Metadata

The metadata extraction system serves several critical purposes:

### 1. **Data Provenance & Traceability**
- Track where data comes from (source URLs, organizations, providers)
- Understand data lineage and how it was collected
- Maintain audit trails for data quality and compliance

### 2. **Data Quality & Reliability**
- Document methodology, units, and measurement approaches
- Track data quality indicators and known issues
- Record validation methods and cross-references

### 3. **Change Detection & Versioning**
- Detect when sources switch between years
- Track methodology changes over time
- Document structural changes in data formats
- Capture explanations for changes (critical for understanding data continuity)

### 4. **Automation & Efficiency**
- Enable automated data collection workflows
- Support web crawling to detect updates
- Facilitate automated quality checks
- Reduce manual data entry and tracking

### 5. **Knowledge Management**
- Build a comprehensive library of data sources
- Learn from patterns across indicators
- Share best practices and methodologies
- Support data discovery and reuse

## Flexible & Extensible Design

### Current Flexibility

The system is designed to be **highly flexible** and **extensible**:

1. **Structured Core Fields**: Standard fields that most indicators share (URLs, units, methodology, etc.)

2. **Custom Fields**: Each indicator can have unique metadata via `customFields`:
   ```typescript
   customFields?: {
     [key: string]: any; // Indicator-specific fields
   }
   ```

3. **Change Tracking**: New `changes` object to track:
   - Source switches between years
   - Methodology changes
   - Data structure changes
   - Explanations for each change

4. **Extensible Parsing**: Pattern-based extraction rules that can be:
   - Added dynamically
   - Customized per indicator
   - Learned from existing metadata

### How We Learn and Expand

1. **Pattern Recognition**: As we extract metadata from more indicators, we identify:
   - Common patterns in Notes tabs
   - Recurring field structures
   - Standard terminology

2. **Rule Building**: New extraction rules are created based on:
   - What we find in new indicators
   - Patterns that emerge across systems
   - User feedback and corrections

3. **Metadata Library Growth**: The system accumulates:
   - Field definitions
   - Extraction patterns
   - Validation rules
   - Best practices

4. **Indicator-Specific Learning**: Each indicator can contribute:
   - Unique fields that others might need
   - Better extraction patterns
   - Validation approaches

## Example: Source Switch Tracking

When an indicator switches sources between years, we can now capture:

```typescript
changes: {
  sourceSwitches: [
    {
      year: 2023,
      fromSource: "IEA World Energy Investment 2022",
      toSource: "IEA World Energy Investment 2023",
      reason: "Annual report update",
      explanation: "The indicator now uses the 2023 edition which includes revised historical data and updated methodology for renewable energy investment calculations.",
      impact: "Historical values from 2015-2022 were revised. New data points added for 2023."
    }
  ]
}
```

## Future Enhancements

1. **Machine Learning**: Train models to extract metadata more accurately
2. **Auto-Discovery**: Automatically detect new metadata fields in Notes tabs
3. **Validation Rules**: Build indicator-specific validation
4. **Cross-Reference**: Link related indicators and sources
5. **Temporal Analysis**: Track how metadata evolves over time

## Next Steps

- Continue extracting metadata from all indicators
- Identify common patterns and build extraction rules
- Add indicator-specific fields as needed
- Build validation and quality checks
- Create metadata search and discovery features

