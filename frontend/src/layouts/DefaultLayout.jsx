import React, { useState, useMemo, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
} from '@dnd-kit/core';

import Navbar from '../components/UI/Navbar';
import SidebarAgent from '../components/UI/SidebarAgent';
import Footer from '../components/UI/Footer';

const DefaultLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [droppedProduct, setDroppedProduct] = useState(null);


  // Sensores: se definen SIEMPRE, sin condicionales
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // arrastra después de mover un poco
            },
        })
    );


    const handleDragEnd = (event) => {
        const { over, active } = event;
        if (over && over.id === 'sidebar-agent-droppable') {
            console.log(`Card con ID: ${active.id} ha sido soltada en el Asistente.`);
            setIsSidebarOpen(true); // abre el sidebar
            setDroppedProduct(active.data.current);
            console.log(`¡Producto ID ${active.id} soltado! Procesando...`);
        }
    };

  const outletContext = useMemo(
    () => ({
      isSidebarOpen,
      setIsSidebarOpen,
    }),
    [isSidebarOpen]
  );

  return (
    <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd}
      measuring={{
        droppable: {
          offset: true,
        },
      }}
    >
      <div className="min-h-screen flex flex-col bg-gray-50 font-inter">
        <Navbar
            onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
            isSidebarOpen={isSidebarOpen}
        />

        <main className="flex-grow container mt-8 mx-auto p-4 md:p-8">
          <Outlet context={outletContext} />
        </main>

        <Footer />
      </div>

      <SidebarAgent isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} product={droppedProduct} />
    </DndContext>
  );
};

export default DefaultLayout;
