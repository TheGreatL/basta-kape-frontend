const QUERY_KEY = {
    AUTH: {
        LOGIN: 'auth:login',
        REGISTER: 'auth:register'
    },
    RBAC: {
        ROLES_LIST: 'rbac:roles_list',
        ROLE_DETAILS: 'rbac:role_details',
        MODULES_PERMISSIONS: 'rbac:modules_permissions',
        PERMISSIONS_LIST: 'rbac:permissions_list',
        MODULES_LIST: 'rbac:modules_list'
    },
    USERS: {
        USERS_LIST: 'users:users_list',
        USER_DETAILS: 'users:user_details'
    },
    SUPPLIERS: {
        SUPPLIERS_LIST: 'suppliers:suppliers_list',
        SUPPLIER_DETAILS: 'suppliers:supplier_details'
    },
    PRODUCT_SETTINGS: {
        CATEGORIES_LIST: 'product_settings:categories_list',
        CATEGORY_DETAILS: 'product_settings:category_details',
        TYPES_LIST: 'product_settings:types_list',
        TYPE_DETAILS: 'product_settings:type_details',
        ATTRIBUTES_LIST: 'product_settings:attributes_list',
        ATTRIBUTE_DETAILS: 'product_settings:attribute_details',
        ATTRIBUTE_VALUES_LIST: 'product_settings:attribute_values_list'
    },
    PRODUCTS: {
        PRODUCTS_LIST: 'products:products_list',
        PRODUCT_DETAILS: 'products:product_details',
        VARIANT_DETAILS: 'products:variant_details',
        VARIANT_RECIPE: 'products:variant_recipe'
    },
    MENU: {
        CATALOG: 'menu:catalog',
        PRODUCT_DETAILS: 'menu:product_details',
        CATEGORIES_LIST: 'menu:categories_list',
        TYPES_LIST: 'menu:types_list'
    },
    INVENTORY: {
        UNITS_LIST: 'inventory:units_list',
        UNIT_DETAILS: 'inventory:unit_details',
        INGREDIENTS_LIST: 'inventory:ingredients_list',
        INGREDIENT_DETAILS: 'inventory:ingredient_details',
        LEVELS_LIST: 'inventory:levels_list',
        LEVEL_DETAILS: 'inventory:level_details',
        DELIVERIES_LIST: 'inventory:deliveries_list',
        ADJUSTMENTS_LIST: 'inventory:adjustments_list',
        FORECAST: 'inventory:forecast'
    },
    CUSTOMERS: {
        CUSTOMERS_LIST: 'customers:customers_list',
        CUSTOMER_DETAILS: 'customers:customer_details',
        CURRENT_CUSTOMER: 'customers:current_customer',
        CART: 'customers:cart'
    }
};
export default QUERY_KEY;
