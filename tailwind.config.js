module.exports = {
    purge: [],
    darkMode: false, // or 'media' or 'class'
    theme: {
        fontFamily: {
            'sans': ['Helvetica', 'sans-serif']
        },
        extend: {
            transitionProperty: {
                'height': 'height'
            }
        },
    },
    variants: {
        backgroundColor: ['responsive', 'hover', 'focus', 'group-hover', 'group-focus', 'active'],
        extend: {}
    },
    plugins: [],
}
