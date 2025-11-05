import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'

// LAYOUTS
import DefaultLayout from './layouts/DefaultLayout'

// PAGES
import Home from './pages/Home'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Cart from './pages/Cart'
import Logout from './pages/Logout'
import Atelier from './pages/Atelier'


const router = createBrowserRouter([
  {
    path: "/", // Here we define default route
    element: <DefaultLayout/>, // Here we render Default Layout with the navbar and sidebar repeated in each children page
    children: [
      {index: true, element: <Home/>},
      {path: "cart", element: <Cart/>},
      {path: "auth/signup", element: <SignUp/>},
      {path: "auth/logout", element: <Logout/>},
      {path: "auth/login", element: <Login/>},
      
    ]
  },
  {path: "/atelier", element: <Atelier/> },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}></RouterProvider>
  </StrictMode>,
)
