import { classNames, homepage } from '../util';
import { Fragment, useState, useEffect } from 'react';
import { Disclosure, Menu } from '@headlessui/react';
import { MdClose, MdMenu, MdNotifications, MdAdd } from 'react-icons/md';
import { Session, useSession } from 'next-auth/client';

export interface NavProps {
    sessionState?: [Session, boolean]
}

export default function Nav(props: NavProps){
    const [session, loading] = props.sessionState || useSession();
    let nav = [];

    if(!loading){
        if(session){
            nav = [
                {name: <><MdAdd className="inline mr-1"/>New Collection</>, href: '/collection/new', cta: true},
                {name: 'Collections', href: '/collections'},
                {name: 'Feed', href: '/feed'},
                {name: 'Profile', href: homepage(session), img: session.user.image, dropdown: [

                ]}
            ]
        }else{
            nav = [
                {name: 'About', href: '/about'},
                {name: 'Support', href: '/support'}
            ];
        }
    }

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
                                        {nav.map((item) => (
                                            <NavLink
                                                key={item.name}
                                                {...item}
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
                            {nav.map((item) => (
                                <DropdownLink
                                    key={item.name}
                                    {...item}
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
    cta?: boolean,
    img?: string
}

function NavLink(props: LinkProps){
    let [active, setActive] = useState(false);
    useEffect(() => setActive(props.href == window.location.pathname));

    if(props.img && props.dropdown){
        return (
            <Menu>
                <Menu.Button>
                    <img
                        src={props.img}
                        className={classNames(
                            'h-8 rounded-full align-middle cursor-pointer',
                            active && 'border-2 border-indigo-200'
                        )}
                        alt={props.href}
                    />
                </Menu.Button>
                <Menu.Items className="bg-red-500">
                    <Menu.Item>
                        {({ active }) => (
                            <DropdownLink href="/">Example</DropdownLink>
                        )}
                    </Menu.Item>
                    <Menu.Item>
                        {({ active }) => (
                            <DropdownLink href="/">Example</DropdownLink>
                        )}
                    </Menu.Item>
                </Menu.Items>
            </Menu>
        );
    }else{
        return (
            <a
                href={props.href}
                className={classNames(
                    !props.cta && (active || props.important ? 'text-indigo-500' : 'text-gray-500 hover:text-indigo-500'),
                    props.cta && 'text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:shadow',
                    'px-3 py-2 rounded-md text-sm align-middle'
                )}
            >
                {props.children}
            </a>
        );
    }
}

function DropdownLink(props: LinkProps){
    let [active, setActive] = useState(false);
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
