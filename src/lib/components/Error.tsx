/**
 * Error Component
 * Exports a paragraph with error message
 */

interface ErrorProps {
    error: string
}

export default function Error(props: ErrorProps){
    return <p className="rounded text-red-400 p-2 mb-3 text-sm font-light bg-red-100">{props.error}</p>;
}
