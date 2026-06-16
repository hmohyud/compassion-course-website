import { ViteReactSSG } from 'vite-react-ssg'
import { routes } from './App'
import './index.css'

// vite-react-ssg owns the router. The same entry powers both the client
// hydration and the Node prerender pass that bakes the 6 public routes.
export const createRoot = ViteReactSSG({ routes, basename: '/' })
