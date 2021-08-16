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
                },
                teal: {
                    100: '#e6fffa',
                    200: '#b2f5ea',
                    300: '#81e6d9',
                    400: '#4fd1c5',
                    500: '#38b2ac',
                    600: '#319795',
                    700: '#2c7a7b',
                    800: '#285e61',
                    900: '#234e52'
                },
                orange: {
                    100: '#fffaf0',
                    200: '#feebc8',
                    300: '#fbd38d',
                    400: '#f6ad55',
                    500: '#ed8936',
                    600: '#dd6b20',
                    700: '#c05621',
                    800: '#9c4221',
                    900: '#7b341e'
                },
            }
        }
    },
    variants: {
        backgroundColor: ['responsive', 'hover', 'focus', 'group-hover', 'group-focus', 'active'],
        extend: {}
    },
    plugins: [],
}
