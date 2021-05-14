import { classNames } from '../util';
import { Fragment, useState, useEffect } from 'react';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { MdClose, MdMenu, MdNotifications } from 'react-icons/md';

const staticNav = [
    {name: 'About', href: '/about', current: false},
    {name: 'Support', href: '/support', current: false}
];

export default function Nav(){
    return (
        <Disclosure as="nav" className="border-b border-gray-300">
            {({ open }) => (
                <>
                    <div className="px-2 sm:px-6 lg:px-8">
                        <div className="relative flex items-center justify-between h-16 max-w">
                            <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                                <Disclosure.Button className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                                    {open ?
                                        <MdClose className="block h-6 w-6"/>
                                        :
                                        <MdMenu className="block h-6 w-6"/>
                                    }
                                </Disclosure.Button>
                            </div>
                            <div className="flex-1 flex items-center justify-end sm:items-stretch sm:justify-start">
                                <div className="flex-shrink-0 flex items-center">
                                    <img
                                        className="h-8 w-auto"
                                        src="/img/logo.png"
                                        alt="Workflow"
                                    />
                                    <h1 className="hidden lg:block mx-4 text-xl text-gray-500"><span className="font-bold">My</span>Portfolio</h1>
                                </div>
                            </div>
                            <div className="flex-1 flex items-center justify-center sm:items-stretch sm:justify-end">
                                <div className="hidden sm:block sm:ml-6">
                                    <div className="flex space-x-4">
                                        {staticNav.map((item) => (
                                            <NavLink
                                                key={item.name}
                                                href={item.href}
                                            >
                                                {item.name}
                                            </NavLink>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Disclosure.Panel className="sm:hidden">
                        <div className="px-2 pt-2 pb-3 space-y-1">
                            {staticNav.map((item) => (
                                <DropdownLink
                                    key={item.name}
                                    href={item.href}
                                >
                                    {item.name}
                                </DropdownLink>
                            ))}
                        </div>
                    </Disclosure.Panel>
                </>
            )}
        </Disclosure>
    )
}

interface LinkProps {
    href: string,
    important?: boolean,
    cta?: boolean
}

function NavLink(props: LinkProps){
    let [active, setActive] = useState(false);
    useEffect(() => setActive(props.href == window.location.pathname));

    return (
        <a
            href={props.href}
            className={classNames(
                active || props.important ? 'text-indigo-500' : 'text-gray-500 hover:text-indigo-500',
                'px-3 py-2 rounded-md text-sm'
            )}
        >
            {props.children}
        </a>
    );
}

function DropdownLink(props: LinkProps){
    let active, setActive = useState(false);
    useEffect(() => setActive(props.href == window.location.pathname));

    return (
        <a
            href={props.href}
            className={classNames(
                active ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                'block px-3 py-2 rounded-md text-base font-medium'
            )}
        >
            {props.children}
        </a>
    );
}
