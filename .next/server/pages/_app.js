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
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   AuthProvider: () => (/* binding */ AuthProvider),\n/* harmony export */   useAuth: () => (/* binding */ useAuth)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/router */ \"(pages-dir-node)/./node_modules/next/router.js\");\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_router__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! axios */ \"axios\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([axios__WEBPACK_IMPORTED_MODULE_3__]);\naxios__WEBPACK_IMPORTED_MODULE_3__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\n\n\n\nconst AuthContext = /*#__PURE__*/ (0,react__WEBPACK_IMPORTED_MODULE_1__.createContext)(undefined);\nconst AuthProvider = ({ children })=>{\n    const router = (0,next_router__WEBPACK_IMPORTED_MODULE_2__.useRouter)();\n    const [authState, setAuthState] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)({\n        isAuthenticated: false,\n        token: null,\n        phoneNumber: null\n    });\n    const [loading, setLoading] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(true);\n    (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)({\n        \"AuthProvider.useEffect\": ()=>{\n            // Check for token in localStorage on mount\n            const token = localStorage.getItem('auth_token');\n            const phoneNumber = localStorage.getItem('phone_number');\n            console.log('AuthContext - Initial token:', token);\n            console.log('AuthContext - Initial phoneNumber:', phoneNumber);\n            if (token) {\n                setAuthState({\n                    isAuthenticated: true,\n                    token,\n                    phoneNumber\n                });\n                // Configure axios defaults for future requests\n                axios__WEBPACK_IMPORTED_MODULE_3__[\"default\"].defaults.headers.common['Authorization'] = `Bearer ${token}`;\n            }\n            setLoading(false);\n        }\n    }[\"AuthProvider.useEffect\"], []);\n    const sendOTP = async (phoneNumber)=>{\n        try {\n            const requestData = {\n                PhoneNumber: phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`\n            };\n            console.log('Sending OTP request:', requestData);\n            const response = await axios__WEBPACK_IMPORTED_MODULE_3__[\"default\"].post('https://fourdotsapp-prod.azurewebsites.net/api/account/register-or-login', requestData);\n            setAuthState((prev)=>({\n                    ...prev,\n                    phoneNumber\n                }));\n            localStorage.setItem('phone_number', phoneNumber);\n        } catch (error) {\n            console.error('Error sending OTP:', error);\n            if (error && typeof error === 'object' && 'response' in error) {\n                const axiosError = error;\n                throw new Error(axiosError.response?.data?.message || 'Failed to send OTP');\n            }\n            throw error;\n        }\n    };\n    const verifyOTP = async (phoneNumber, otp)=>{\n        try {\n            const requestData = {\n                PhoneNumber: phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`,\n                Otp: otp\n            };\n            console.log('Verifying OTP request:', requestData);\n            const response = await axios__WEBPACK_IMPORTED_MODULE_3__[\"default\"].post('https://fourdotsapp-prod.azurewebsites.net/api/account/verify-otp', requestData);\n            console.log('OTP verification response:', response.data);\n            const token = response.data.token;\n            setAuthState({\n                isAuthenticated: true,\n                token,\n                phoneNumber\n            });\n            localStorage.setItem('auth_token', token);\n            localStorage.setItem('phone_number', phoneNumber);\n            // Configure axios defaults for future requests\n            axios__WEBPACK_IMPORTED_MODULE_3__[\"default\"].defaults.headers.common['Authorization'] = `Bearer ${token}`;\n            router.push('/orders');\n        } catch (error) {\n            console.error('Error verifying OTP:', error);\n            if (error && typeof error === 'object' && 'response' in error) {\n                const axiosError = error;\n                throw new Error(axiosError.response?.data?.message || 'Failed to verify OTP');\n            }\n            throw error;\n        }\n    };\n    const logout = ()=>{\n        console.log('Logging out...');\n        setAuthState({\n            isAuthenticated: false,\n            token: null,\n            phoneNumber: null\n        });\n        localStorage.removeItem('auth_token');\n        localStorage.removeItem('phone_number');\n        delete axios__WEBPACK_IMPORTED_MODULE_3__[\"default\"].defaults.headers.common['Authorization'];\n        router.push('/login');\n    };\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(AuthContext.Provider, {\n        value: {\n            ...authState,\n            sendOTP,\n            verifyOTP,\n            logout,\n            loading\n        },\n        children: children\n    }, void 0, false, {\n        fileName: \"C:\\\\Users\\\\donbi\\\\printdot-admin\\\\src\\\\contexts\\\\AuthContext.tsx\",\n        lineNumber: 123,\n        columnNumber: 5\n    }, undefined);\n};\nconst useAuth = ()=>{\n    const context = (0,react__WEBPACK_IMPORTED_MODULE_1__.useContext)(AuthContext);\n    if (context === undefined) {\n        throw new Error('useAuth must be used within an AuthProvider');\n    }\n    return context;\n};\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3NyYy9jb250ZXh0cy9BdXRoQ29udGV4dC50c3giLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQUE4RTtBQUN0QztBQUNkO0FBYzFCLE1BQU1PLDRCQUFjTixvREFBYUEsQ0FBOEJPO0FBRXhELE1BQU1DLGVBQXdELENBQUMsRUFBRUMsUUFBUSxFQUFFO0lBQ2hGLE1BQU1DLFNBQVNOLHNEQUFTQTtJQUN4QixNQUFNLENBQUNPLFdBQVdDLGFBQWEsR0FBR1YsK0NBQVFBLENBQVk7UUFDcERXLGlCQUFpQjtRQUNqQkMsT0FBTztRQUNQQyxhQUFhO0lBQ2Y7SUFDQSxNQUFNLENBQUNDLFNBQVNDLFdBQVcsR0FBR2YsK0NBQVFBLENBQUM7SUFFdkNDLGdEQUFTQTtrQ0FBQztZQUNSLDJDQUEyQztZQUMzQyxNQUFNVyxRQUFRSSxhQUFhQyxPQUFPLENBQUM7WUFDbkMsTUFBTUosY0FBY0csYUFBYUMsT0FBTyxDQUFDO1lBRXpDQyxRQUFRQyxHQUFHLENBQUMsZ0NBQWdDUDtZQUM1Q00sUUFBUUMsR0FBRyxDQUFDLHNDQUFzQ047WUFFbEQsSUFBSUQsT0FBTztnQkFDVEYsYUFBYTtvQkFDWEMsaUJBQWlCO29CQUNqQkM7b0JBQ0FDO2dCQUNGO2dCQUNBLCtDQUErQztnQkFDL0NWLHNEQUFjLENBQUNrQixPQUFPLENBQUNDLE1BQU0sQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLE9BQU8sRUFBRVYsT0FBTztZQUNwRTtZQUNBRyxXQUFXO1FBQ2I7aUNBQUcsRUFBRTtJQUVMLE1BQU1RLFVBQVUsT0FBT1Y7UUFDckIsSUFBSTtZQUNGLE1BQU1XLGNBQW9DO2dCQUN4Q0MsYUFBYVosWUFBWWEsVUFBVSxDQUFDLFNBQVNiLGNBQWMsQ0FBQyxHQUFHLEVBQUVBLGFBQWE7WUFDaEY7WUFFQUssUUFBUUMsR0FBRyxDQUFDLHdCQUF3Qks7WUFDcEMsTUFBTUcsV0FBVyxNQUFNeEIsa0RBQVUsQ0FBQyw0RUFBNEVxQjtZQUU5R2QsYUFBYW1CLENBQUFBLE9BQVM7b0JBQUUsR0FBR0EsSUFBSTtvQkFBRWhCO2dCQUFZO1lBQzdDRyxhQUFhYyxPQUFPLENBQUMsZ0JBQWdCakI7UUFDdkMsRUFBRSxPQUFPa0IsT0FBZ0I7WUFDdkJiLFFBQVFhLEtBQUssQ0FBQyxzQkFBc0JBO1lBQ3BDLElBQUlBLFNBQVMsT0FBT0EsVUFBVSxZQUFZLGNBQWNBLE9BQU87Z0JBQzdELE1BQU1DLGFBQWFEO2dCQUNuQixNQUFNLElBQUlFLE1BQU1ELFdBQVdMLFFBQVEsRUFBRU8sTUFBTUMsV0FBVztZQUN4RDtZQUNBLE1BQU1KO1FBQ1I7SUFDRjtJQUVBLE1BQU1LLFlBQVksT0FBT3ZCLGFBQXFCd0I7UUFDNUMsSUFBSTtZQUNGLE1BQU1iLGNBQWdDO2dCQUNwQ0MsYUFBYVosWUFBWWEsVUFBVSxDQUFDLFNBQVNiLGNBQWMsQ0FBQyxHQUFHLEVBQUVBLGFBQWE7Z0JBQzlFeUIsS0FBS0Q7WUFDUDtZQUVBbkIsUUFBUUMsR0FBRyxDQUFDLDBCQUEwQks7WUFDdEMsTUFBTUcsV0FBVyxNQUFNeEIsa0RBQVUsQ0FDL0IscUVBQ0FxQjtZQUdGTixRQUFRQyxHQUFHLENBQUMsOEJBQThCUSxTQUFTTyxJQUFJO1lBQ3ZELE1BQU10QixRQUFRZSxTQUFTTyxJQUFJLENBQUN0QixLQUFLO1lBQ2pDRixhQUFhO2dCQUNYQyxpQkFBaUI7Z0JBQ2pCQztnQkFDQUM7WUFDRjtZQUVBRyxhQUFhYyxPQUFPLENBQUMsY0FBY2xCO1lBQ25DSSxhQUFhYyxPQUFPLENBQUMsZ0JBQWdCakI7WUFFckMsK0NBQStDO1lBQy9DVixzREFBYyxDQUFDa0IsT0FBTyxDQUFDQyxNQUFNLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxPQUFPLEVBQUVWLE9BQU87WUFFbEVKLE9BQU8rQixJQUFJLENBQUM7UUFDZCxFQUFFLE9BQU9SLE9BQWdCO1lBQ3ZCYixRQUFRYSxLQUFLLENBQUMsd0JBQXdCQTtZQUN0QyxJQUFJQSxTQUFTLE9BQU9BLFVBQVUsWUFBWSxjQUFjQSxPQUFPO2dCQUM3RCxNQUFNQyxhQUFhRDtnQkFDbkIsTUFBTSxJQUFJRSxNQUFNRCxXQUFXTCxRQUFRLEVBQUVPLE1BQU1DLFdBQVc7WUFDeEQ7WUFDQSxNQUFNSjtRQUNSO0lBQ0Y7SUFFQSxNQUFNUyxTQUFTO1FBQ2J0QixRQUFRQyxHQUFHLENBQUM7UUFDWlQsYUFBYTtZQUNYQyxpQkFBaUI7WUFDakJDLE9BQU87WUFDUEMsYUFBYTtRQUNmO1FBRUFHLGFBQWF5QixVQUFVLENBQUM7UUFDeEJ6QixhQUFheUIsVUFBVSxDQUFDO1FBQ3hCLE9BQU90QyxzREFBYyxDQUFDa0IsT0FBTyxDQUFDQyxNQUFNLENBQUMsZ0JBQWdCO1FBRXJEZCxPQUFPK0IsSUFBSSxDQUFDO0lBQ2Q7SUFFQSxxQkFDRSw4REFBQ25DLFlBQVlzQyxRQUFRO1FBQ25CQyxPQUFPO1lBQ0wsR0FBR2xDLFNBQVM7WUFDWmM7WUFDQWE7WUFDQUk7WUFDQTFCO1FBQ0Y7a0JBRUNQOzs7Ozs7QUFHUCxFQUFFO0FBRUssTUFBTXFDLFVBQVU7SUFDckIsTUFBTUMsVUFBVTlDLGlEQUFVQSxDQUFDSztJQUMzQixJQUFJeUMsWUFBWXhDLFdBQVc7UUFDekIsTUFBTSxJQUFJNEIsTUFBTTtJQUNsQjtJQUNBLE9BQU9ZO0FBQ1QsRUFBRSIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxkb25iaVxccHJpbnRkb3QtYWRtaW5cXHNyY1xcY29udGV4dHNcXEF1dGhDb250ZXh0LnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QsIHsgY3JlYXRlQ29udGV4dCwgdXNlQ29udGV4dCwgdXNlU3RhdGUsIHVzZUVmZmVjdCB9IGZyb20gJ3JlYWN0JztcclxuaW1wb3J0IHsgdXNlUm91dGVyIH0gZnJvbSAnbmV4dC9yb3V0ZXInO1xyXG5pbXBvcnQgYXhpb3MgZnJvbSAnYXhpb3MnO1xyXG5pbXBvcnQgeyBBdXRoU3RhdGUsIFJlZ2lzdGVyTG9naW5SZXF1ZXN0LCBWZXJpZnlPVFBSZXF1ZXN0LCBBdXRoUmVzcG9uc2UgfSBmcm9tICdAL3R5cGVzL2F1dGgnO1xyXG5cclxuaW50ZXJmYWNlIEVycm9yUmVzcG9uc2Uge1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxufVxyXG5cclxuaW50ZXJmYWNlIEF1dGhDb250ZXh0VHlwZSBleHRlbmRzIEF1dGhTdGF0ZSB7XHJcbiAgc2VuZE9UUDogKHBob25lTnVtYmVyOiBzdHJpbmcpID0+IFByb21pc2U8dm9pZD47XHJcbiAgdmVyaWZ5T1RQOiAocGhvbmVOdW1iZXI6IHN0cmluZywgb3RwOiBzdHJpbmcpID0+IFByb21pc2U8dm9pZD47XHJcbiAgbG9nb3V0OiAoKSA9PiB2b2lkO1xyXG4gIGxvYWRpbmc6IGJvb2xlYW47XHJcbn1cclxuXHJcbmNvbnN0IEF1dGhDb250ZXh0ID0gY3JlYXRlQ29udGV4dDxBdXRoQ29udGV4dFR5cGUgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XHJcblxyXG5leHBvcnQgY29uc3QgQXV0aFByb3ZpZGVyOiBSZWFjdC5GQzx7IGNoaWxkcmVuOiBSZWFjdC5SZWFjdE5vZGUgfT4gPSAoeyBjaGlsZHJlbiB9KSA9PiB7XHJcbiAgY29uc3Qgcm91dGVyID0gdXNlUm91dGVyKCk7XHJcbiAgY29uc3QgW2F1dGhTdGF0ZSwgc2V0QXV0aFN0YXRlXSA9IHVzZVN0YXRlPEF1dGhTdGF0ZT4oe1xyXG4gICAgaXNBdXRoZW50aWNhdGVkOiBmYWxzZSxcclxuICAgIHRva2VuOiBudWxsLFxyXG4gICAgcGhvbmVOdW1iZXI6IG51bGwsXHJcbiAgfSk7XHJcbiAgY29uc3QgW2xvYWRpbmcsIHNldExvYWRpbmddID0gdXNlU3RhdGUodHJ1ZSk7XHJcblxyXG4gIHVzZUVmZmVjdCgoKSA9PiB7XHJcbiAgICAvLyBDaGVjayBmb3IgdG9rZW4gaW4gbG9jYWxTdG9yYWdlIG9uIG1vdW50XHJcbiAgICBjb25zdCB0b2tlbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdhdXRoX3Rva2VuJyk7XHJcbiAgICBjb25zdCBwaG9uZU51bWJlciA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdwaG9uZV9udW1iZXInKTtcclxuICAgIFxyXG4gICAgY29uc29sZS5sb2coJ0F1dGhDb250ZXh0IC0gSW5pdGlhbCB0b2tlbjonLCB0b2tlbik7XHJcbiAgICBjb25zb2xlLmxvZygnQXV0aENvbnRleHQgLSBJbml0aWFsIHBob25lTnVtYmVyOicsIHBob25lTnVtYmVyKTtcclxuICAgIFxyXG4gICAgaWYgKHRva2VuKSB7XHJcbiAgICAgIHNldEF1dGhTdGF0ZSh7XHJcbiAgICAgICAgaXNBdXRoZW50aWNhdGVkOiB0cnVlLFxyXG4gICAgICAgIHRva2VuLFxyXG4gICAgICAgIHBob25lTnVtYmVyLFxyXG4gICAgICB9KTtcclxuICAgICAgLy8gQ29uZmlndXJlIGF4aW9zIGRlZmF1bHRzIGZvciBmdXR1cmUgcmVxdWVzdHNcclxuICAgICAgYXhpb3MuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHt0b2tlbn1gO1xyXG4gICAgfVxyXG4gICAgc2V0TG9hZGluZyhmYWxzZSk7XHJcbiAgfSwgW10pO1xyXG5cclxuICBjb25zdCBzZW5kT1RQID0gYXN5bmMgKHBob25lTnVtYmVyOiBzdHJpbmcpID0+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlcXVlc3REYXRhOiBSZWdpc3RlckxvZ2luUmVxdWVzdCA9IHtcclxuICAgICAgICBQaG9uZU51bWJlcjogcGhvbmVOdW1iZXIuc3RhcnRzV2l0aCgnKzkxJykgPyBwaG9uZU51bWJlciA6IGArOTEke3Bob25lTnVtYmVyfWBcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKCdTZW5kaW5nIE9UUCByZXF1ZXN0OicsIHJlcXVlc3REYXRhKTtcclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBheGlvcy5wb3N0KCdodHRwczovL2ZvdXJkb3RzYXBwLXByb2QuYXp1cmV3ZWJzaXRlcy5uZXQvYXBpL2FjY291bnQvcmVnaXN0ZXItb3ItbG9naW4nLCByZXF1ZXN0RGF0YSk7XHJcbiAgICAgIFxyXG4gICAgICBzZXRBdXRoU3RhdGUocHJldiA9PiAoeyAuLi5wcmV2LCBwaG9uZU51bWJlciB9KSk7XHJcbiAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdwaG9uZV9udW1iZXInLCBwaG9uZU51bWJlcik7XHJcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzZW5kaW5nIE9UUDonLCBlcnJvcik7XHJcbiAgICAgIGlmIChlcnJvciAmJiB0eXBlb2YgZXJyb3IgPT09ICdvYmplY3QnICYmICdyZXNwb25zZScgaW4gZXJyb3IpIHtcclxuICAgICAgICBjb25zdCBheGlvc0Vycm9yID0gZXJyb3IgYXMgeyByZXNwb25zZT86IHsgZGF0YT86IHsgbWVzc2FnZT86IHN0cmluZyB9IH0gfTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYXhpb3NFcnJvci5yZXNwb25zZT8uZGF0YT8ubWVzc2FnZSB8fCAnRmFpbGVkIHRvIHNlbmQgT1RQJyk7XHJcbiAgICAgIH1cclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgY29uc3QgdmVyaWZ5T1RQID0gYXN5bmMgKHBob25lTnVtYmVyOiBzdHJpbmcsIG90cDogc3RyaW5nKSA9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXF1ZXN0RGF0YTogVmVyaWZ5T1RQUmVxdWVzdCA9IHtcclxuICAgICAgICBQaG9uZU51bWJlcjogcGhvbmVOdW1iZXIuc3RhcnRzV2l0aCgnKzkxJykgPyBwaG9uZU51bWJlciA6IGArOTEke3Bob25lTnVtYmVyfWAsXHJcbiAgICAgICAgT3RwOiBvdHBcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKCdWZXJpZnlpbmcgT1RQIHJlcXVlc3Q6JywgcmVxdWVzdERhdGEpO1xyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGF4aW9zLnBvc3Q8QXV0aFJlc3BvbnNlPihcclxuICAgICAgICAnaHR0cHM6Ly9mb3VyZG90c2FwcC1wcm9kLmF6dXJld2Vic2l0ZXMubmV0L2FwaS9hY2NvdW50L3ZlcmlmeS1vdHAnLFxyXG4gICAgICAgIHJlcXVlc3REYXRhXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZygnT1RQIHZlcmlmaWNhdGlvbiByZXNwb25zZTonLCByZXNwb25zZS5kYXRhKTtcclxuICAgICAgY29uc3QgdG9rZW4gPSByZXNwb25zZS5kYXRhLnRva2VuO1xyXG4gICAgICBzZXRBdXRoU3RhdGUoe1xyXG4gICAgICAgIGlzQXV0aGVudGljYXRlZDogdHJ1ZSxcclxuICAgICAgICB0b2tlbixcclxuICAgICAgICBwaG9uZU51bWJlcixcclxuICAgICAgfSk7XHJcbiAgICAgIFxyXG4gICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnYXV0aF90b2tlbicsIHRva2VuKTtcclxuICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3Bob25lX251bWJlcicsIHBob25lTnVtYmVyKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENvbmZpZ3VyZSBheGlvcyBkZWZhdWx0cyBmb3IgZnV0dXJlIHJlcXVlc3RzXHJcbiAgICAgIGF4aW9zLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7dG9rZW59YDtcclxuICAgICAgXHJcbiAgICAgIHJvdXRlci5wdXNoKCcvb3JkZXJzJyk7XHJcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB2ZXJpZnlpbmcgT1RQOicsIGVycm9yKTtcclxuICAgICAgaWYgKGVycm9yICYmIHR5cGVvZiBlcnJvciA9PT0gJ29iamVjdCcgJiYgJ3Jlc3BvbnNlJyBpbiBlcnJvcikge1xyXG4gICAgICAgIGNvbnN0IGF4aW9zRXJyb3IgPSBlcnJvciBhcyB7IHJlc3BvbnNlPzogeyBkYXRhPzogeyBtZXNzYWdlPzogc3RyaW5nIH0gfSB9O1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihheGlvc0Vycm9yLnJlc3BvbnNlPy5kYXRhPy5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gdmVyaWZ5IE9UUCcpO1xyXG4gICAgICB9XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGNvbnN0IGxvZ291dCA9ICgpID0+IHtcclxuICAgIGNvbnNvbGUubG9nKCdMb2dnaW5nIG91dC4uLicpO1xyXG4gICAgc2V0QXV0aFN0YXRlKHtcclxuICAgICAgaXNBdXRoZW50aWNhdGVkOiBmYWxzZSxcclxuICAgICAgdG9rZW46IG51bGwsXHJcbiAgICAgIHBob25lTnVtYmVyOiBudWxsLFxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdhdXRoX3Rva2VuJyk7XHJcbiAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgncGhvbmVfbnVtYmVyJyk7XHJcbiAgICBkZWxldGUgYXhpb3MuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ0F1dGhvcml6YXRpb24nXTtcclxuICAgIFxyXG4gICAgcm91dGVyLnB1c2goJy9sb2dpbicpO1xyXG4gIH07XHJcblxyXG4gIHJldHVybiAoXHJcbiAgICA8QXV0aENvbnRleHQuUHJvdmlkZXJcclxuICAgICAgdmFsdWU9e3tcclxuICAgICAgICAuLi5hdXRoU3RhdGUsXHJcbiAgICAgICAgc2VuZE9UUCxcclxuICAgICAgICB2ZXJpZnlPVFAsXHJcbiAgICAgICAgbG9nb3V0LFxyXG4gICAgICAgIGxvYWRpbmcsXHJcbiAgICAgIH19XHJcbiAgICA+XHJcbiAgICAgIHtjaGlsZHJlbn1cclxuICAgIDwvQXV0aENvbnRleHQuUHJvdmlkZXI+XHJcbiAgKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCB1c2VBdXRoID0gKCkgPT4ge1xyXG4gIGNvbnN0IGNvbnRleHQgPSB1c2VDb250ZXh0KEF1dGhDb250ZXh0KTtcclxuICBpZiAoY29udGV4dCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3VzZUF1dGggbXVzdCBiZSB1c2VkIHdpdGhpbiBhbiBBdXRoUHJvdmlkZXInKTtcclxuICB9XHJcbiAgcmV0dXJuIGNvbnRleHQ7XHJcbn07ICJdLCJuYW1lcyI6WyJSZWFjdCIsImNyZWF0ZUNvbnRleHQiLCJ1c2VDb250ZXh0IiwidXNlU3RhdGUiLCJ1c2VFZmZlY3QiLCJ1c2VSb3V0ZXIiLCJheGlvcyIsIkF1dGhDb250ZXh0IiwidW5kZWZpbmVkIiwiQXV0aFByb3ZpZGVyIiwiY2hpbGRyZW4iLCJyb3V0ZXIiLCJhdXRoU3RhdGUiLCJzZXRBdXRoU3RhdGUiLCJpc0F1dGhlbnRpY2F0ZWQiLCJ0b2tlbiIsInBob25lTnVtYmVyIiwibG9hZGluZyIsInNldExvYWRpbmciLCJsb2NhbFN0b3JhZ2UiLCJnZXRJdGVtIiwiY29uc29sZSIsImxvZyIsImRlZmF1bHRzIiwiaGVhZGVycyIsImNvbW1vbiIsInNlbmRPVFAiLCJyZXF1ZXN0RGF0YSIsIlBob25lTnVtYmVyIiwic3RhcnRzV2l0aCIsInJlc3BvbnNlIiwicG9zdCIsInByZXYiLCJzZXRJdGVtIiwiZXJyb3IiLCJheGlvc0Vycm9yIiwiRXJyb3IiLCJkYXRhIiwibWVzc2FnZSIsInZlcmlmeU9UUCIsIm90cCIsIk90cCIsInB1c2giLCJsb2dvdXQiLCJyZW1vdmVJdGVtIiwiUHJvdmlkZXIiLCJ2YWx1ZSIsInVzZUF1dGgiLCJjb250ZXh0Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(pages-dir-node)/./src/contexts/AuthContext.tsx\n");

/***/ }),

/***/ "(pages-dir-node)/./src/pages/_app.tsx":
/*!****************************!*\
  !*** ./src/pages/_app.tsx ***!
  \****************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ App)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _contexts_AuthContext__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/contexts/AuthContext */ \"(pages-dir-node)/./src/contexts/AuthContext.tsx\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/styles/globals.css */ \"(pages-dir-node)/./src/styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_2__);\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_contexts_AuthContext__WEBPACK_IMPORTED_MODULE_1__]);\n_contexts_AuthContext__WEBPACK_IMPORTED_MODULE_1__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\n\n\nfunction App({ Component, pageProps }) {\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_contexts_AuthContext__WEBPACK_IMPORTED_MODULE_1__.AuthProvider, {\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n            ...pageProps\n        }, void 0, false, {\n            fileName: \"C:\\\\Users\\\\donbi\\\\printdot-admin\\\\src\\\\pages\\\\_app.tsx\",\n            lineNumber: 8,\n            columnNumber: 7\n        }, this)\n    }, void 0, false, {\n        fileName: \"C:\\\\Users\\\\donbi\\\\printdot-admin\\\\src\\\\pages\\\\_app.tsx\",\n        lineNumber: 7,\n        columnNumber: 5\n    }, this);\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3NyYy9wYWdlcy9fYXBwLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0FBQ3NEO0FBQ3hCO0FBRWYsU0FBU0MsSUFBSSxFQUFFQyxTQUFTLEVBQUVDLFNBQVMsRUFBWTtJQUM1RCxxQkFDRSw4REFBQ0gsK0RBQVlBO2tCQUNYLDRFQUFDRTtZQUFXLEdBQUdDLFNBQVM7Ozs7Ozs7Ozs7O0FBRzlCIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXGRvbmJpXFxwcmludGRvdC1hZG1pblxcc3JjXFxwYWdlc1xcX2FwcC50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBBcHBQcm9wcyB9IGZyb20gJ25leHQvYXBwJztcclxuaW1wb3J0IHsgQXV0aFByb3ZpZGVyIH0gZnJvbSAnQC9jb250ZXh0cy9BdXRoQ29udGV4dCc7XHJcbmltcG9ydCAnQC9zdHlsZXMvZ2xvYmFscy5jc3MnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQXBwKHsgQ29tcG9uZW50LCBwYWdlUHJvcHMgfTogQXBwUHJvcHMpIHtcclxuICByZXR1cm4gKFxyXG4gICAgPEF1dGhQcm92aWRlcj5cclxuICAgICAgPENvbXBvbmVudCB7Li4ucGFnZVByb3BzfSAvPlxyXG4gICAgPC9BdXRoUHJvdmlkZXI+XHJcbiAgKTtcclxufSAiXSwibmFtZXMiOlsiQXV0aFByb3ZpZGVyIiwiQXBwIiwiQ29tcG9uZW50IiwicGFnZVByb3BzIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(pages-dir-node)/./src/pages/_app.tsx\n");

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