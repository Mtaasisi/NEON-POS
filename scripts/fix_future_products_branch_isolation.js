    return {
      productsWithBranchId: productsWithBranchId[0].count,
      variantsWithoutBranchId: variantsWithoutBranchId[0].count,
      variantColumns,
      activeBranches,
      schemaValid: !hasProductBranchId && hasVariantBranchId && branchIdNullable === 'NO' && parseInt(variantsWithoutBranchId[0].count) === 0
    };