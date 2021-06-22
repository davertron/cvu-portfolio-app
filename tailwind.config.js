module.exports = {
    purge: [],
    darkMode: false, // or 'media' or 'class'
    theme: {
        fontFamily: {
            'sans': ['Helvetica', 'sans-serif']
        },
        extend: {
            zIndex: {
                '-10': '-10'
            },
            transitionProperty: {
                'height': 'height'
            },
            colors: {
                indigo: {
                    light: '#888ece'
                }
            }
        }
    },
    variants: {
        backgroundColor: ['responsive', 'hover', 'focus', 'group-hover', 'group-focus', 'active'],
        extend: {}
    },
    plugins: [],
}
