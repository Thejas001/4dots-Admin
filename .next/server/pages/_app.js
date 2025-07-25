/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/_app";
exports.ids = ["pages/_app"];
exports.modules = {

/***/ "(pages-dir-node)/./src/contexts/AuthContext.tsx":
/*!**************************************!*\
  !*** ./src/contexts/AuthContext.tsx ***!
  \**************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   AuthProvider: () => (/* binding */ AuthProvider),\n/* harmony export */   useAuth: () => (/* binding */ useAuth)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/router */ \"(pages-dir-node)/./node_modules/next/router.js\");\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_router__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! axios */ \"axios\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([axios__WEBPACK_IMPORTED_MODULE_3__]);\naxios__WEBPACK_IMPORTED_MODULE_3__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\n\n\n\nconst AuthContext = /*#__PURE__*/ (0,react__WEBPACK_IMPORTED_MODULE_1__.createContext)(undefined);\nconst AuthProvider = ({ children })=>{\n    const router = (0,next_router__WEBPACK_IMPORTED_MODULE_2__.useRouter)();\n    const [authState, setAuthState] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)({\n        isAuthenticated: false,\n        token: null,\n        phoneNumber: null\n    });\n    (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)({\n        \"AuthProvider.useEffect\": ()=>{\n            // Check for token in localStorage on mount\n            const token = localStorage.getItem('auth_token');\n            const phoneNumber = localStorage.getItem('phone_number');\n            console.log('AuthContext - Initial token:', token);\n            console.log('AuthContext - Initial phoneNumber:', phoneNumber);\n            if (token) {\n                setAuthState({\n                    isAuthenticated: true,\n                    token,\n                    phoneNumber\n                });\n                // Configure axios defaults for future requests\n                axios__WEBPACK_IMPORTED_MODULE_3__[\"default\"].defaults.headers.common['Authorization'] = `Bearer ${token}`;\n            }\n        }\n    }[\"AuthProvider.useEffect\"], []);\n    const sendOTP = async (phoneNumber)=>{\n        try {\n            const requestData = {\n                PhoneNumber: phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`\n            };\n            console.log('Sending OTP request:', requestData);\n            const response = await axios__WEBPACK_IMPORTED_MODULE_3__[\"default\"].post('https://fourdotsapp.azurewebsites.net/api/account/register-or-login', requestData);\n            setAuthState((prev)=>({\n                    ...prev,\n                    phoneNumber\n                }));\n            localStorage.setItem('phone_number', phoneNumber);\n        } catch (error) {\n            console.error('Error sending OTP:', error);\n            if (error && typeof error === 'object' && 'response' in error) {\n                const axiosError = error;\n                throw new Error(axiosError.response?.data?.message || 'Failed to send OTP');\n            }\n            throw error;\n        }\n    };\n    const verifyOTP = async (phoneNumber, otp)=>{\n        try {\n            const requestData = {\n                PhoneNumber: phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`,\n                Otp: otp\n            };\n            console.log('Verifying OTP request:', requestData);\n            const response = await axios__WEBPACK_IMPORTED_MODULE_3__[\"default\"].post('https://fourdotsapp.azurewebsites.net/api/account/verify-otp', requestData);\n            console.log('OTP verification response:', response.data);\n            const token = response.data.token;\n            setAuthState({\n                isAuthenticated: true,\n                token,\n                phoneNumber\n            });\n            localStorage.setItem('auth_token', token);\n            localStorage.setItem('phone_number', phoneNumber);\n            // Configure axios defaults for future requests\n            axios__WEBPACK_IMPORTED_MODULE_3__[\"default\"].defaults.headers.common['Authorization'] = `Bearer ${token}`;\n            router.push('/orders');\n        } catch (error) {\n            console.error('Error verifying OTP:', error);\n            if (error && typeof error === 'object' && 'response' in error) {\n                const axiosError = error;\n                throw new Error(axiosError.response?.data?.message || 'Failed to verify OTP');\n            }\n            throw error;\n        }\n    };\n    const logout = ()=>{\n        console.log('Logging out...');\n        setAuthState({\n            isAuthenticated: false,\n            token: null,\n            phoneNumber: null\n        });\n        localStorage.removeItem('auth_token');\n        localStorage.removeItem('phone_number');\n        delete axios__WEBPACK_IMPORTED_MODULE_3__[\"default\"].defaults.headers.common['Authorization'];\n        router.push('/login');\n    };\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(AuthContext.Provider, {\n        value: {\n            ...authState,\n            sendOTP,\n            verifyOTP,\n            logout\n        },\n        children: children\n    }, void 0, false, {\n        fileName: \"E:\\\\printdot-admin\\\\src\\\\contexts\\\\AuthContext.tsx\",\n        lineNumber: 120,\n        columnNumber: 5\n    }, undefined);\n};\nconst useAuth = ()=>{\n    const context = (0,react__WEBPACK_IMPORTED_MODULE_1__.useContext)(AuthContext);\n    if (context === undefined) {\n        throw new Error('useAuth must be used within an AuthProvider');\n    }\n    return context;\n};\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3NyYy9jb250ZXh0cy9BdXRoQ29udGV4dC50c3giLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQUE4RTtBQUN0QztBQUNkO0FBYTFCLE1BQU1PLDRCQUFjTixvREFBYUEsQ0FBOEJPO0FBRXhELE1BQU1DLGVBQXdELENBQUMsRUFBRUMsUUFBUSxFQUFFO0lBQ2hGLE1BQU1DLFNBQVNOLHNEQUFTQTtJQUN4QixNQUFNLENBQUNPLFdBQVdDLGFBQWEsR0FBR1YsK0NBQVFBLENBQVk7UUFDcERXLGlCQUFpQjtRQUNqQkMsT0FBTztRQUNQQyxhQUFhO0lBQ2Y7SUFFQVosZ0RBQVNBO2tDQUFDO1lBQ1IsMkNBQTJDO1lBQzNDLE1BQU1XLFFBQVFFLGFBQWFDLE9BQU8sQ0FBQztZQUNuQyxNQUFNRixjQUFjQyxhQUFhQyxPQUFPLENBQUM7WUFFekNDLFFBQVFDLEdBQUcsQ0FBQyxnQ0FBZ0NMO1lBQzVDSSxRQUFRQyxHQUFHLENBQUMsc0NBQXNDSjtZQUVsRCxJQUFJRCxPQUFPO2dCQUNURixhQUFhO29CQUNYQyxpQkFBaUI7b0JBQ2pCQztvQkFDQUM7Z0JBQ0Y7Z0JBQ0EsK0NBQStDO2dCQUMvQ1Ysc0RBQWMsQ0FBQ2dCLE9BQU8sQ0FBQ0MsTUFBTSxDQUFDLGdCQUFnQixHQUFHLENBQUMsT0FBTyxFQUFFUixPQUFPO1lBQ3BFO1FBQ0Y7aUNBQUcsRUFBRTtJQUVMLE1BQU1TLFVBQVUsT0FBT1I7UUFDckIsSUFBSTtZQUNGLE1BQU1TLGNBQW9DO2dCQUN4Q0MsYUFBYVYsWUFBWVcsVUFBVSxDQUFDLFNBQVNYLGNBQWMsQ0FBQyxHQUFHLEVBQUVBLGFBQWE7WUFDaEY7WUFFQUcsUUFBUUMsR0FBRyxDQUFDLHdCQUF3Qks7WUFDcEMsTUFBTUcsV0FBVyxNQUFNdEIsa0RBQVUsQ0FBQyx1RUFBdUVtQjtZQUV6R1osYUFBYWlCLENBQUFBLE9BQVM7b0JBQUUsR0FBR0EsSUFBSTtvQkFBRWQ7Z0JBQVk7WUFDN0NDLGFBQWFjLE9BQU8sQ0FBQyxnQkFBZ0JmO1FBQ3ZDLEVBQUUsT0FBT2dCLE9BQWdCO1lBQ3ZCYixRQUFRYSxLQUFLLENBQUMsc0JBQXNCQTtZQUNwQyxJQUFJQSxTQUFTLE9BQU9BLFVBQVUsWUFBWSxjQUFjQSxPQUFPO2dCQUM3RCxNQUFNQyxhQUFhRDtnQkFDbkIsTUFBTSxJQUFJRSxNQUFNRCxXQUFXTCxRQUFRLEVBQUVPLE1BQU1DLFdBQVc7WUFDeEQ7WUFDQSxNQUFNSjtRQUNSO0lBQ0Y7SUFFQSxNQUFNSyxZQUFZLE9BQU9yQixhQUFxQnNCO1FBQzVDLElBQUk7WUFDRixNQUFNYixjQUFnQztnQkFDcENDLGFBQWFWLFlBQVlXLFVBQVUsQ0FBQyxTQUFTWCxjQUFjLENBQUMsR0FBRyxFQUFFQSxhQUFhO2dCQUM5RXVCLEtBQUtEO1lBQ1A7WUFFQW5CLFFBQVFDLEdBQUcsQ0FBQywwQkFBMEJLO1lBQ3RDLE1BQU1HLFdBQVcsTUFBTXRCLGtEQUFVLENBQy9CLGdFQUNBbUI7WUFHRk4sUUFBUUMsR0FBRyxDQUFDLDhCQUE4QlEsU0FBU08sSUFBSTtZQUN2RCxNQUFNcEIsUUFBUWEsU0FBU08sSUFBSSxDQUFDcEIsS0FBSztZQUNqQ0YsYUFBYTtnQkFDWEMsaUJBQWlCO2dCQUNqQkM7Z0JBQ0FDO1lBQ0Y7WUFFQUMsYUFBYWMsT0FBTyxDQUFDLGNBQWNoQjtZQUNuQ0UsYUFBYWMsT0FBTyxDQUFDLGdCQUFnQmY7WUFFckMsK0NBQStDO1lBQy9DVixzREFBYyxDQUFDZ0IsT0FBTyxDQUFDQyxNQUFNLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxPQUFPLEVBQUVSLE9BQU87WUFFbEVKLE9BQU82QixJQUFJLENBQUM7UUFDZCxFQUFFLE9BQU9SLE9BQWdCO1lBQ3ZCYixRQUFRYSxLQUFLLENBQUMsd0JBQXdCQTtZQUN0QyxJQUFJQSxTQUFTLE9BQU9BLFVBQVUsWUFBWSxjQUFjQSxPQUFPO2dCQUM3RCxNQUFNQyxhQUFhRDtnQkFDbkIsTUFBTSxJQUFJRSxNQUFNRCxXQUFXTCxRQUFRLEVBQUVPLE1BQU1DLFdBQVc7WUFDeEQ7WUFDQSxNQUFNSjtRQUNSO0lBQ0Y7SUFFQSxNQUFNUyxTQUFTO1FBQ2J0QixRQUFRQyxHQUFHLENBQUM7UUFDWlAsYUFBYTtZQUNYQyxpQkFBaUI7WUFDakJDLE9BQU87WUFDUEMsYUFBYTtRQUNmO1FBRUFDLGFBQWF5QixVQUFVLENBQUM7UUFDeEJ6QixhQUFheUIsVUFBVSxDQUFDO1FBQ3hCLE9BQU9wQyxzREFBYyxDQUFDZ0IsT0FBTyxDQUFDQyxNQUFNLENBQUMsZ0JBQWdCO1FBRXJEWixPQUFPNkIsSUFBSSxDQUFDO0lBQ2Q7SUFFQSxxQkFDRSw4REFBQ2pDLFlBQVlvQyxRQUFRO1FBQ25CQyxPQUFPO1lBQ0wsR0FBR2hDLFNBQVM7WUFDWlk7WUFDQWE7WUFDQUk7UUFDRjtrQkFFQy9COzs7Ozs7QUFHUCxFQUFFO0FBRUssTUFBTW1DLFVBQVU7SUFDckIsTUFBTUMsVUFBVTVDLGlEQUFVQSxDQUFDSztJQUMzQixJQUFJdUMsWUFBWXRDLFdBQVc7UUFDekIsTUFBTSxJQUFJMEIsTUFBTTtJQUNsQjtJQUNBLE9BQU9ZO0FBQ1QsRUFBRSIsInNvdXJjZXMiOlsiRTpcXHByaW50ZG90LWFkbWluXFxzcmNcXGNvbnRleHRzXFxBdXRoQ29udGV4dC50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0LCB7IGNyZWF0ZUNvbnRleHQsIHVzZUNvbnRleHQsIHVzZVN0YXRlLCB1c2VFZmZlY3QgfSBmcm9tICdyZWFjdCc7XHJcbmltcG9ydCB7IHVzZVJvdXRlciB9IGZyb20gJ25leHQvcm91dGVyJztcclxuaW1wb3J0IGF4aW9zIGZyb20gJ2F4aW9zJztcclxuaW1wb3J0IHsgQXV0aFN0YXRlLCBSZWdpc3RlckxvZ2luUmVxdWVzdCwgVmVyaWZ5T1RQUmVxdWVzdCwgQXV0aFJlc3BvbnNlIH0gZnJvbSAnQC90eXBlcy9hdXRoJztcclxuXHJcbmludGVyZmFjZSBFcnJvclJlc3BvbnNlIHtcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBBdXRoQ29udGV4dFR5cGUgZXh0ZW5kcyBBdXRoU3RhdGUge1xyXG4gIHNlbmRPVFA6IChwaG9uZU51bWJlcjogc3RyaW5nKSA9PiBQcm9taXNlPHZvaWQ+O1xyXG4gIHZlcmlmeU9UUDogKHBob25lTnVtYmVyOiBzdHJpbmcsIG90cDogc3RyaW5nKSA9PiBQcm9taXNlPHZvaWQ+O1xyXG4gIGxvZ291dDogKCkgPT4gdm9pZDtcclxufVxyXG5cclxuY29uc3QgQXV0aENvbnRleHQgPSBjcmVhdGVDb250ZXh0PEF1dGhDb250ZXh0VHlwZSB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcclxuXHJcbmV4cG9ydCBjb25zdCBBdXRoUHJvdmlkZXI6IFJlYWN0LkZDPHsgY2hpbGRyZW46IFJlYWN0LlJlYWN0Tm9kZSB9PiA9ICh7IGNoaWxkcmVuIH0pID0+IHtcclxuICBjb25zdCByb3V0ZXIgPSB1c2VSb3V0ZXIoKTtcclxuICBjb25zdCBbYXV0aFN0YXRlLCBzZXRBdXRoU3RhdGVdID0gdXNlU3RhdGU8QXV0aFN0YXRlPih7XHJcbiAgICBpc0F1dGhlbnRpY2F0ZWQ6IGZhbHNlLFxyXG4gICAgdG9rZW46IG51bGwsXHJcbiAgICBwaG9uZU51bWJlcjogbnVsbCxcclxuICB9KTtcclxuXHJcbiAgdXNlRWZmZWN0KCgpID0+IHtcclxuICAgIC8vIENoZWNrIGZvciB0b2tlbiBpbiBsb2NhbFN0b3JhZ2Ugb24gbW91bnRcclxuICAgIGNvbnN0IHRva2VuID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2F1dGhfdG9rZW4nKTtcclxuICAgIGNvbnN0IHBob25lTnVtYmVyID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3Bob25lX251bWJlcicpO1xyXG4gICAgXHJcbiAgICBjb25zb2xlLmxvZygnQXV0aENvbnRleHQgLSBJbml0aWFsIHRva2VuOicsIHRva2VuKTtcclxuICAgIGNvbnNvbGUubG9nKCdBdXRoQ29udGV4dCAtIEluaXRpYWwgcGhvbmVOdW1iZXI6JywgcGhvbmVOdW1iZXIpO1xyXG4gICAgXHJcbiAgICBpZiAodG9rZW4pIHtcclxuICAgICAgc2V0QXV0aFN0YXRlKHtcclxuICAgICAgICBpc0F1dGhlbnRpY2F0ZWQ6IHRydWUsXHJcbiAgICAgICAgdG9rZW4sXHJcbiAgICAgICAgcGhvbmVOdW1iZXIsXHJcbiAgICAgIH0pO1xyXG4gICAgICAvLyBDb25maWd1cmUgYXhpb3MgZGVmYXVsdHMgZm9yIGZ1dHVyZSByZXF1ZXN0c1xyXG4gICAgICBheGlvcy5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vblsnQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke3Rva2VufWA7XHJcbiAgICB9XHJcbiAgfSwgW10pO1xyXG5cclxuICBjb25zdCBzZW5kT1RQID0gYXN5bmMgKHBob25lTnVtYmVyOiBzdHJpbmcpID0+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlcXVlc3REYXRhOiBSZWdpc3RlckxvZ2luUmVxdWVzdCA9IHtcclxuICAgICAgICBQaG9uZU51bWJlcjogcGhvbmVOdW1iZXIuc3RhcnRzV2l0aCgnKzkxJykgPyBwaG9uZU51bWJlciA6IGArOTEke3Bob25lTnVtYmVyfWBcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKCdTZW5kaW5nIE9UUCByZXF1ZXN0OicsIHJlcXVlc3REYXRhKTtcclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBheGlvcy5wb3N0KCdodHRwczovL2ZvdXJkb3RzYXBwLmF6dXJld2Vic2l0ZXMubmV0L2FwaS9hY2NvdW50L3JlZ2lzdGVyLW9yLWxvZ2luJywgcmVxdWVzdERhdGEpO1xyXG4gICAgICBcclxuICAgICAgc2V0QXV0aFN0YXRlKHByZXYgPT4gKHsgLi4ucHJldiwgcGhvbmVOdW1iZXIgfSkpO1xyXG4gICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncGhvbmVfbnVtYmVyJywgcGhvbmVOdW1iZXIpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3Igc2VuZGluZyBPVFA6JywgZXJyb3IpO1xyXG4gICAgICBpZiAoZXJyb3IgJiYgdHlwZW9mIGVycm9yID09PSAnb2JqZWN0JyAmJiAncmVzcG9uc2UnIGluIGVycm9yKSB7XHJcbiAgICAgICAgY29uc3QgYXhpb3NFcnJvciA9IGVycm9yIGFzIHsgcmVzcG9uc2U/OiB7IGRhdGE/OiB7IG1lc3NhZ2U/OiBzdHJpbmcgfSB9IH07XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGF4aW9zRXJyb3IucmVzcG9uc2U/LmRhdGE/Lm1lc3NhZ2UgfHwgJ0ZhaWxlZCB0byBzZW5kIE9UUCcpO1xyXG4gICAgICB9XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGNvbnN0IHZlcmlmeU9UUCA9IGFzeW5jIChwaG9uZU51bWJlcjogc3RyaW5nLCBvdHA6IHN0cmluZykgPT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcmVxdWVzdERhdGE6IFZlcmlmeU9UUFJlcXVlc3QgPSB7XHJcbiAgICAgICAgUGhvbmVOdW1iZXI6IHBob25lTnVtYmVyLnN0YXJ0c1dpdGgoJys5MScpID8gcGhvbmVOdW1iZXIgOiBgKzkxJHtwaG9uZU51bWJlcn1gLFxyXG4gICAgICAgIE90cDogb3RwXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zb2xlLmxvZygnVmVyaWZ5aW5nIE9UUCByZXF1ZXN0OicsIHJlcXVlc3REYXRhKTtcclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBheGlvcy5wb3N0PEF1dGhSZXNwb25zZT4oXHJcbiAgICAgICAgJ2h0dHBzOi8vZm91cmRvdHNhcHAuYXp1cmV3ZWJzaXRlcy5uZXQvYXBpL2FjY291bnQvdmVyaWZ5LW90cCcsXHJcbiAgICAgICAgcmVxdWVzdERhdGFcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKCdPVFAgdmVyaWZpY2F0aW9uIHJlc3BvbnNlOicsIHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICBjb25zdCB0b2tlbiA9IHJlc3BvbnNlLmRhdGEudG9rZW47XHJcbiAgICAgIHNldEF1dGhTdGF0ZSh7XHJcbiAgICAgICAgaXNBdXRoZW50aWNhdGVkOiB0cnVlLFxyXG4gICAgICAgIHRva2VuLFxyXG4gICAgICAgIHBob25lTnVtYmVyLFxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdhdXRoX3Rva2VuJywgdG9rZW4pO1xyXG4gICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncGhvbmVfbnVtYmVyJywgcGhvbmVOdW1iZXIpO1xyXG4gICAgICBcclxuICAgICAgLy8gQ29uZmlndXJlIGF4aW9zIGRlZmF1bHRzIGZvciBmdXR1cmUgcmVxdWVzdHNcclxuICAgICAgYXhpb3MuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHt0b2tlbn1gO1xyXG4gICAgICBcclxuICAgICAgcm91dGVyLnB1c2goJy9vcmRlcnMnKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHZlcmlmeWluZyBPVFA6JywgZXJyb3IpO1xyXG4gICAgICBpZiAoZXJyb3IgJiYgdHlwZW9mIGVycm9yID09PSAnb2JqZWN0JyAmJiAncmVzcG9uc2UnIGluIGVycm9yKSB7XHJcbiAgICAgICAgY29uc3QgYXhpb3NFcnJvciA9IGVycm9yIGFzIHsgcmVzcG9uc2U/OiB7IGRhdGE/OiB7IG1lc3NhZ2U/OiBzdHJpbmcgfSB9IH07XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGF4aW9zRXJyb3IucmVzcG9uc2U/LmRhdGE/Lm1lc3NhZ2UgfHwgJ0ZhaWxlZCB0byB2ZXJpZnkgT1RQJyk7XHJcbiAgICAgIH1cclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgY29uc3QgbG9nb3V0ID0gKCkgPT4ge1xyXG4gICAgY29uc29sZS5sb2coJ0xvZ2dpbmcgb3V0Li4uJyk7XHJcbiAgICBzZXRBdXRoU3RhdGUoe1xyXG4gICAgICBpc0F1dGhlbnRpY2F0ZWQ6IGZhbHNlLFxyXG4gICAgICB0b2tlbjogbnVsbCxcclxuICAgICAgcGhvbmVOdW1iZXI6IG51bGwsXHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2F1dGhfdG9rZW4nKTtcclxuICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdwaG9uZV9udW1iZXInKTtcclxuICAgIGRlbGV0ZSBheGlvcy5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vblsnQXV0aG9yaXphdGlvbiddO1xyXG4gICAgXHJcbiAgICByb3V0ZXIucHVzaCgnL2xvZ2luJyk7XHJcbiAgfTtcclxuXHJcbiAgcmV0dXJuIChcclxuICAgIDxBdXRoQ29udGV4dC5Qcm92aWRlclxyXG4gICAgICB2YWx1ZT17e1xyXG4gICAgICAgIC4uLmF1dGhTdGF0ZSxcclxuICAgICAgICBzZW5kT1RQLFxyXG4gICAgICAgIHZlcmlmeU9UUCxcclxuICAgICAgICBsb2dvdXQsXHJcbiAgICAgIH19XHJcbiAgICA+XHJcbiAgICAgIHtjaGlsZHJlbn1cclxuICAgIDwvQXV0aENvbnRleHQuUHJvdmlkZXI+XHJcbiAgKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCB1c2VBdXRoID0gKCkgPT4ge1xyXG4gIGNvbnN0IGNvbnRleHQgPSB1c2VDb250ZXh0KEF1dGhDb250ZXh0KTtcclxuICBpZiAoY29udGV4dCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3VzZUF1dGggbXVzdCBiZSB1c2VkIHdpdGhpbiBhbiBBdXRoUHJvdmlkZXInKTtcclxuICB9XHJcbiAgcmV0dXJuIGNvbnRleHQ7XHJcbn07ICJdLCJuYW1lcyI6WyJSZWFjdCIsImNyZWF0ZUNvbnRleHQiLCJ1c2VDb250ZXh0IiwidXNlU3RhdGUiLCJ1c2VFZmZlY3QiLCJ1c2VSb3V0ZXIiLCJheGlvcyIsIkF1dGhDb250ZXh0IiwidW5kZWZpbmVkIiwiQXV0aFByb3ZpZGVyIiwiY2hpbGRyZW4iLCJyb3V0ZXIiLCJhdXRoU3RhdGUiLCJzZXRBdXRoU3RhdGUiLCJpc0F1dGhlbnRpY2F0ZWQiLCJ0b2tlbiIsInBob25lTnVtYmVyIiwibG9jYWxTdG9yYWdlIiwiZ2V0SXRlbSIsImNvbnNvbGUiLCJsb2ciLCJkZWZhdWx0cyIsImhlYWRlcnMiLCJjb21tb24iLCJzZW5kT1RQIiwicmVxdWVzdERhdGEiLCJQaG9uZU51bWJlciIsInN0YXJ0c1dpdGgiLCJyZXNwb25zZSIsInBvc3QiLCJwcmV2Iiwic2V0SXRlbSIsImVycm9yIiwiYXhpb3NFcnJvciIsIkVycm9yIiwiZGF0YSIsIm1lc3NhZ2UiLCJ2ZXJpZnlPVFAiLCJvdHAiLCJPdHAiLCJwdXNoIiwibG9nb3V0IiwicmVtb3ZlSXRlbSIsIlByb3ZpZGVyIiwidmFsdWUiLCJ1c2VBdXRoIiwiY29udGV4dCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(pages-dir-node)/./src/contexts/AuthContext.tsx\n");

/***/ }),

/***/ "(pages-dir-node)/./src/pages/_app.tsx":
/*!****************************!*\
  !*** ./src/pages/_app.tsx ***!
  \****************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ App)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _contexts_AuthContext__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/contexts/AuthContext */ \"(pages-dir-node)/./src/contexts/AuthContext.tsx\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/styles/globals.css */ \"(pages-dir-node)/./src/styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_2__);\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_contexts_AuthContext__WEBPACK_IMPORTED_MODULE_1__]);\n_contexts_AuthContext__WEBPACK_IMPORTED_MODULE_1__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\n\n\nfunction App({ Component, pageProps }) {\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_contexts_AuthContext__WEBPACK_IMPORTED_MODULE_1__.AuthProvider, {\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n            ...pageProps\n        }, void 0, false, {\n            fileName: \"E:\\\\printdot-admin\\\\src\\\\pages\\\\_app.tsx\",\n            lineNumber: 8,\n            columnNumber: 7\n        }, this)\n    }, void 0, false, {\n        fileName: \"E:\\\\printdot-admin\\\\src\\\\pages\\\\_app.tsx\",\n        lineNumber: 7,\n        columnNumber: 5\n    }, this);\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3NyYy9wYWdlcy9fYXBwLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0FBQ3NEO0FBQ3hCO0FBRWYsU0FBU0MsSUFBSSxFQUFFQyxTQUFTLEVBQUVDLFNBQVMsRUFBWTtJQUM1RCxxQkFDRSw4REFBQ0gsK0RBQVlBO2tCQUNYLDRFQUFDRTtZQUFXLEdBQUdDLFNBQVM7Ozs7Ozs7Ozs7O0FBRzlCIiwic291cmNlcyI6WyJFOlxccHJpbnRkb3QtYWRtaW5cXHNyY1xccGFnZXNcXF9hcHAudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0eXBlIHsgQXBwUHJvcHMgfSBmcm9tICduZXh0L2FwcCc7XHJcbmltcG9ydCB7IEF1dGhQcm92aWRlciB9IGZyb20gJ0AvY29udGV4dHMvQXV0aENvbnRleHQnO1xyXG5pbXBvcnQgJ0Avc3R5bGVzL2dsb2JhbHMuY3NzJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEFwcCh7IENvbXBvbmVudCwgcGFnZVByb3BzIH06IEFwcFByb3BzKSB7XHJcbiAgcmV0dXJuIChcclxuICAgIDxBdXRoUHJvdmlkZXI+XHJcbiAgICAgIDxDb21wb25lbnQgey4uLnBhZ2VQcm9wc30gLz5cclxuICAgIDwvQXV0aFByb3ZpZGVyPlxyXG4gICk7XHJcbn0gIl0sIm5hbWVzIjpbIkF1dGhQcm92aWRlciIsIkFwcCIsIkNvbXBvbmVudCIsInBhZ2VQcm9wcyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(pages-dir-node)/./src/pages/_app.tsx\n");

/***/ }),

/***/ "(pages-dir-node)/./src/styles/globals.css":
/*!********************************!*\
  !*** ./src/styles/globals.css ***!
  \********************************/
/***/ (() => {



/***/ }),

/***/ "axios":
/*!************************!*\
  !*** external "axios" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = import("axios");;

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "next/dist/compiled/next-server/pages.runtime.dev.js":
/*!**********************************************************************!*\
  !*** external "next/dist/compiled/next-server/pages.runtime.dev.js" ***!
  \**********************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/pages.runtime.dev.js");

/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("react");

/***/ }),

/***/ "react-dom":
/*!****************************!*\
  !*** external "react-dom" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("react-dom");

/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-dev-runtime");

/***/ }),

/***/ "react/jsx-runtime":
/*!************************************!*\
  !*** external "react/jsx-runtime" ***!
  \************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-runtime");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@swc"], () => (__webpack_exec__("(pages-dir-node)/./src/pages/_app.tsx")));
module.exports = __webpack_exports__;

})();