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
    }
};
export default QUERY_KEY;
