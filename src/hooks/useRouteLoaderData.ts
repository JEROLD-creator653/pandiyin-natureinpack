import React, { useEffect } from 'react';

export const useRouteLoaderData = <T>(promise: Promise<T> | (() => Promise<T>), deps: any[] = []) => {
  useEffect(() => {
    const loadPromise = typeof promise === 'function' ? promise() : promise;
    if ((window as any).__routeLoaderRegister) {
      (window as any).__routeLoaderRegister(loadPromise);
    }
  }, deps);
};

export const useRegisterDataLoad = () => {
  const registerDataLoad = <T>(promise: Promise<T>) => {
    if ((window as any).__routeLoaderRegisterDataLoad) {
      return (window as any).__routeLoaderRegisterDataLoad(promise);
    }
    return promise;
  };

  return { registerDataLoad };
};
