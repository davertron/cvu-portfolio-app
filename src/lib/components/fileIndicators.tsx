import {
    HiOutlineMicrophone,
    HiOutlineDocument,
    HiOutlinePencilAlt,
    HiOutlineDocumentText,
    HiOutlineClipboardList,
    HiOutlinePhotograph,
    HiOutlineTable,
    HiOutlineMap,
    HiOutlinePresentationChartBar,
    HiOutlineTerminal,
    HiOutlineGlobe,
    HiOutlineVideoCamera,
    HiOutlineExclamation
} from 'react-icons/hi';

export const fileIndicators = {
    'audio': {
        from: 'teal-400',
        to: 'blue-600',
        icon: HiOutlineMicrophone
    },
    'document': {
        from: 'blue-300',
        to: 'blue-500',
        icon: HiOutlineDocumentText
    },
    'drawing': {
        from: 'red-300',
        to: 'red-500',
        icon: HiOutlinePencilAlt
    },
    'file': {
        from: 'purple-400',
        to: 'indigo-700',
        icon: HiOutlineDocument
    },
    'form': {
        from: 'purple-300',
        to: 'purple-500',
        icon: HiOutlineClipboardList
    },
    'photo': {
        from: 'blue-300',
        to: 'indigo-500',
        icon: HiOutlinePhotograph
    },
    'fusiontable': {
        from: 'green-400',
        to: 'teal-600',
        icon: HiOutlineTable
    },
    'map': {
        from: 'orange-300',
        to: 'red-500',
        icon: HiOutlineMap
    },
    'presentation': {
        from: 'yellow-300',
        to: 'yellow-500',
        icon: HiOutlinePresentationChartBar
    },
    'script': {
        from: 'indigo-400',
        to: 'purple-600',
        icon: HiOutlineTerminal
    },
    'site': {
        from: 'indigo-300',
        to: 'indigo-500',
        icon: HiOutlineGlobe
    },
    'spreadsheet': {
        from: 'green-300',
        to: 'green-500',
        icon: HiOutlineTable
    },
    'video': {
        from: 'orange-400',
        to: 'orange-600',
        icon: HiOutlineVideoCamera
    },
    'error': {
        from: 'pink-400',
        to: 'red-600',
        icon: HiOutlineExclamation
    }
}
