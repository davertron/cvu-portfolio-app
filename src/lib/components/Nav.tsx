/**
 /**
 * Nav Component
 * Creates site navigation
 */

import { classNames, homepage } from '../util';
import { Props, Parent, Interactive, Child } from './types';
import { useState, useEffect } from 'react';
import { Disclosure, Menu } from '@headlessui/react'; //expandable and collapsible elements
import { MouseEventHandler } from 'react';
import { MdClose, MdMenu, MdAdd } from 'react-icons/md';
import { useSession, signOut } from 'next-auth/client';
import Link from 'next/link';

export default function Nav(){
    const [session, loading] = useSession();
    let nav: LinkProps[] = [];

    if(!loading){
        if(session){
            nav = [
                {children: <><MdAdd className="inline mr-1"/>New Collection</>, href: '/collections/new', cta: true},
                {children: 'Collections', href: '/collections'},
                {children: 'Blog', href: '/blog'},
                {children: 'Profile', href: homepage(session), img: session.user.image, dropdown: [
                    {children: 'Profile', href: homepage(session)},
                    {children: 'Sign out', onClick: () => signOut()}
                ]}
            ]
        }else{
            nav = [
                {children: 'About', href: '/about'},
                {children: 'Support', href: '/support'}
            ];
        }
    }

    return (
        <Disclosure as="nav" className="border-b border-gray-300">
            {({ open }) => (
                <>
                    <div className="px-2 sm:px-6 lg:px-8">
                        <div className="relative flex items-center justify-between h-16 max-w">
                            <div className="absolute inset-y-0 right-0 flex items-center sm:hidden">
                                <Disclosure.Button className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-indigo-500 focus:outline-none">
                                    {open ?
                                        <MdClose className="block h-6 w-6"/>
                                        :
                                        <MdMenu className="block h-6 w-6"/>
                                    }
                                </Disclosure.Button>
                            </div>
                            <div className="flex items-center justify-end sm:items-stretch sm:justify-start">
                                <div className="flex-shrink-0 flex items-center">
                                    <Link href="/">
                                        <a className="block flex flex-row items-center">
                                            <div className="flex items-center">
                                                <img
                                                    className="h-8 w-auto"
                                                    src="/img/logo.png"
                                                    alt="MyPortfolio"
                                                />
                                            </div>
                                            <div><h1 className="block mx-4 text-xl text-gray-500"><span className="font-bold">My</span>Portfolio</h1></div>
                                        </a>
                                    </Link>
                                </div>
                            </div>
                            <div className="flex-1 flex items-center justify-center sm:items-stretch sm:justify-end">
                                <div className="hidden sm:block sm:ml-6">
                                    <div className="flex space-x-4">
                                        {nav.map((item) => (
                                            <NavLink
                                                key={item.children as string}
                                                {...item}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Disclosure.Panel className="sm:hidden">
                        <div className="px-2 pt-2 pb-3 space-y-1">
                            {nav.map(item => (
                                <DropdownLink
                                    key={item.children as string}
                                    {...item}
                                />
                            ))}
                        </div>
                    </Disclosure.Panel>
                </>
            )}
        </Disclosure>
    )
}

interface LinkProps extends Props, Interactive, Parent {
    href?: string
    display?: string
    name?: Child
    important?: boolean
    img?: string
    cta?: boolean
    dropdown?: LinkProps[]
}

function NavLink(props: LinkProps){
    let [active, setActive] = useState(false);
    useEffect(() => setActive(props.href == window.location.pathname));

    if(props.img && props.dropdown){
        return (
            <Menu>
                <Menu.Button className="focus:outline-none">
                    <img
                        src={props.img}
                        className={classNames(
                            'h-8 w-8 rounded-full align-middle cursor-pointer',
                            active && 'border border-indigo-400'
                        )}
                        alt={props.href}
                    />
                </Menu.Button>
                <Menu.Items className="origin-top-right absolute right-0 mt-11 w-48 rounded border border-gray-200 bg-white shadow focus:outline-none">
                    {props.dropdown.map(option => (
                        <Menu.Item key={option.children as string}>
                            {_e => (
                                <DropdownLink {...option}/>
                            )}
                        </Menu.Item>
                    ))}
                </Menu.Items>
            </Menu>
        );
    }else if(props.href){
        return (
            <Link href={props.href}>
                <a
                    className={classNames(
                        !props.cta && (active || props.important ? 'text-indigo-500' : 'text-gray-500 hover:text-indigo-500'),
                        props.cta && 'text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:shadow',
                        props.display,
                        props.className,
                        'px-3 py-2 rounded-md text-sm align-middle cursor-pointer'
                    )}
                >
                    {props.children}
                </a>
            </Link>
        );
    }else{
        return (
            <a
                onClick={props.onClick as MouseEventHandler}
                className={classNames(
                    !props.cta && (active || props.important ? 'text-indigo-500' : 'text-gray-500 hover:text-indigo-500'),
                    props.cta && 'text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:shadow',
                    props.display,
                    props.className,
                    'px-3 py-2 rounded-md text-sm align-middle cursor-pointer'
                )}
            >
                {props.children}
            </a>
        );
    }
}

function DropdownLink(props: LinkProps){
    return (
        <NavLink {...props} display="block"/>
    );
}
